import bcrypt from 'bcryptjs';
import { AuthProvider, Role } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { normalizeStaffDepartment } from '../lib/departments.js';
import { AppError } from '../lib/permissions.js';

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
