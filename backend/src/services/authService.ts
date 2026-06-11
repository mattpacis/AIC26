import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { AuthProvider, Role } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { normalizeStaffDepartment } from '../lib/departments.js';
import { env } from '../lib/env.js';
import { AppError } from '../lib/permissions.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function readPreferencesObject(raw: string | null | undefined) {
  if (!raw) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function mergeUserPreferences(userId: string, patch: Record<string, unknown>) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const merged = { ...readPreferencesObject(user?.preferences), ...patch };
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: JSON.stringify(merged) },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function registerLocalAccount(input: {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'staff';
  department?: string;
}) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const password = input.password;

  if (!name) {
    throw new AppError(400, 'Name is required');
  }

  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const school = await prisma.school.findFirst();
  if (!school) {
    throw new AppError(500, 'No school configured');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const dbRole = input.role === 'staff' ? Role.STAFF : Role.STUDENT;

  let department: string | undefined;
  if (dbRole === Role.STAFF) {
    if (!input.department?.trim()) {
      throw new AppError(400, 'Department is required for staff accounts');
    }
    department = normalizeStaffDepartment(input.department);
  }

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      authProvider: AuthProvider.LOCAL,
      role: dbRole,
      schoolId: school.id,
      ...(department ? { department } : {}),
      ...(dbRole === Role.STUDENT
        ? {
            student: {
              create: { schoolId: school.id },
            },
          }
        : {}),
    },
    include: {
      school: true,
      student: true,
    },
  });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      school: true,
      student: true,
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.passwordHash) {
    throw new Error('This account uses Google or Microsoft sign-in');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  return user;
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      school: true,
      student: true,
    },
  });
}

export async function updateUserProfile(userId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError(400, 'Name is required');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { name: trimmed },
    include: { school: true, student: true },
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (newPassword.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    throw new AppError(400, 'This account uses Google or Microsoft sign-in');
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function requestPasswordReset(email: string) {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user?.passwordHash) {
    return { ok: true as const, message: 'If that account exists, reset instructions were sent.' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await mergeUserPreferences(user.id, { resetTokenHash, resetTokenExpires });

  const response: {
    ok: true;
    message: string;
    resetToken?: string;
  } = {
    ok: true,
    message: 'If that account exists, reset instructions were sent.',
  };

  if (env.NODE_ENV !== 'production') {
    response.resetToken = token;
  }

  return response;
}

export async function resetPasswordWithToken(
  email: string,
  token: string,
  newPassword: string,
) {
  if (newPassword.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }

  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user?.passwordHash) {
    throw new AppError(400, 'Invalid or expired reset link');
  }

  const prefs = readPreferencesObject(user.preferences);
  const storedHash = typeof prefs.resetTokenHash === 'string' ? prefs.resetTokenHash : null;
  const expires =
    typeof prefs.resetTokenExpires === 'string' ? prefs.resetTokenExpires : null;

  if (!storedHash || !expires) {
    throw new AppError(400, 'Invalid or expired reset link');
  }

  if (new Date(expires).getTime() < Date.now()) {
    throw new AppError(400, 'Reset link has expired');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  if (tokenHash !== storedHash) {
    throw new AppError(400, 'Invalid or expired reset link');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await mergeUserPreferences(user.id, {
    resetTokenHash: null,
    resetTokenExpires: null,
  });
}

export async function deleteUserAccount(userId: string) {
  const studentTicketIds = (
    await prisma.ticket.findMany({
      where: { studentUserId: userId },
      select: { id: true },
    })
  ).map((ticket) => ticket.id);

  const threads = await prisma.chatThread.findMany({
    where: { userId },
    select: { id: true },
  });
  const threadIds = threads.map((thread) => thread.id);

  await prisma.$transaction(async (tx) => {
    if (threadIds.length > 0) {
      await tx.chatMessage.deleteMany({
        where: { threadId: { in: threadIds } },
      });
    }

    if (studentTicketIds.length > 0) {
      await tx.ticketReply.deleteMany({
        where: { ticketId: { in: studentTicketIds } },
      });
    }

    await tx.ticketReply.deleteMany({ where: { authorUserId: userId } });
    await tx.ticket.deleteMany({ where: { studentUserId: userId } });
    await tx.appointment.deleteMany({ where: { studentUserId: userId } });
    await tx.studentHold.deleteMany({ where: { studentUserId: userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.actionLog.deleteMany({ where: { userId } });
    await tx.chatThread.deleteMany({ where: { userId } });
    await tx.student.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}

export function toPublicUser(user: NonNullable<Awaited<ReturnType<typeof getUserById>>>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.toLowerCase(),
    department: user.department,
    school: {
      id: user.school.id,
      name: user.school.name,
    },
    student: user.student
      ? {
          id: user.student.id,
          grade: user.student.grade,
        }
      : null,
  };
}
