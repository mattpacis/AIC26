import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';
import {
  type AuthContext,
  assertCanCreateTicketFor,
  assertSameSchool,
  AppError,
  staffDepartmentScope,
} from '../lib/permissions.js';
import { assertSlotAvailable } from './appointmentAvailabilityService.js';
import { logAction } from './actionLogService.js';

export type AppointmentListFilters = {
  status?: 'all' | 'upcoming' | 'completed';
  year?: number;
  month?: number;
  day?: number;
};

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDisplayTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function parseBringItems(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function toApiStatus(status: AppointmentStatus, scheduledAt: Date) {
  if (status === AppointmentStatus.CANCELLED) return 'cancelled' as const;
  if (status === AppointmentStatus.COMPLETED) return 'completed' as const;
  if (scheduledAt.getTime() < Date.now()) return 'completed' as const;
  return 'upcoming' as const;
}

export function serializeAppointment(appointment: {
  id: string;
  title: string;
  department: string;
  purpose: string | null;
  location: string | null;
  staffName: string | null;
  status: AppointmentStatus;
  urgencyLabel: string | null;
  barColor: string;
  ticketNumber: string | null;
  scheduledAt: Date;
  deadline: Date | null;
  bringItems: string | null;
  studentUser?: { name: string; email: string } | null;
}) {
  const apiStatus = toApiStatus(appointment.status, appointment.scheduledAt);
  const details: Array<{
    label: string;
    value: string;
    link?: string;
    warn?: boolean;
  }> = [];

  if (appointment.purpose) {
    details.push({ label: 'Purpose', value: appointment.purpose });
  }
  if (appointment.ticketNumber) {
    details.push({
      label: 'Ticket',
      value: `#${appointment.ticketNumber}`,
      link: appointment.ticketNumber,
    });
  }
  details.push({ label: 'Department', value: appointment.department });
  if (appointment.deadline) {
    details.push({
      label: 'Deadline',
      value: formatDisplayDate(appointment.deadline),
      warn: true,
    });
  }
  if (appointment.staffName && !details.some((row) => row.label === 'Counselor')) {
    const counselorLabel =
      appointment.department.toLowerCase().includes('guidance') ||
      appointment.title.toLowerCase().includes('counsel')
        ? 'Counselor'
        : 'Staff';
    if (counselorLabel === 'Counselor') {
      details.push({ label: 'Counselor', value: appointment.staffName });
    }
  }

  const scheduled = appointment.scheduledAt;

  return {
    id: appointment.id,
    title: appointment.title,
    department: appointment.department,
    purpose: appointment.purpose,
    location: appointment.location,
    staffName: appointment.staffName,
    status: apiStatus,
    urgencyLabel: appointment.urgencyLabel,
    barColor: appointment.barColor,
    ticketNumber: appointment.ticketNumber,
    scheduledAt: scheduled.toISOString(),
    date: formatDisplayDate(scheduled),
    time: formatDisplayTime(scheduled),
    deadline: appointment.deadline?.toISOString() ?? null,
    bringItems: parseBringItems(appointment.bringItems),
    details,
    miniSub: `${formatDisplayDate(scheduled).replace(', 2026', '')} · ${formatDisplayTime(scheduled)} · ${appointment.location ?? appointment.department}`,
    studentName: appointment.studentUser?.name ?? null,
    studentEmail: appointment.studentUser?.email ?? null,
  };
}

function listWhere(ctx: AuthContext, filters: AppointmentListFilters) {
  const department = staffDepartmentScope(ctx);
  const where: {
    schoolId: string;
    studentUserId?: string;
    department?: string;
    status?: { in: AppointmentStatus[] } | AppointmentStatus;
    scheduledAt?: { gte?: Date; lt?: Date };
  } = {
    schoolId: ctx.schoolId,
    ...(department ? { department } : {}),
  };

  if (ctx.role === 'STUDENT') {
    where.studentUserId = ctx.userId;
  }

  if (filters.status === 'upcoming') {
    where.status = AppointmentStatus.SCHEDULED;
  } else if (filters.status === 'completed') {
    where.status = AppointmentStatus.COMPLETED;
  }

  if (
    filters.year !== undefined &&
    filters.month !== undefined &&
    filters.day !== undefined
  ) {
    const start = new Date(filters.year, filters.month, filters.day, 0, 0, 0, 0);
    const end = new Date(filters.year, filters.month, filters.day + 1, 0, 0, 0, 0);
    where.scheduledAt = { gte: start, lt: end };
  } else if (filters.year !== undefined && filters.month !== undefined) {
    const start = new Date(filters.year, filters.month, 1, 0, 0, 0, 0);
    const end = new Date(filters.year, filters.month + 1, 1, 0, 0, 0, 0);
    where.scheduledAt = { gte: start, lt: end };
  }

  return where;
}

export async function listAppointments(
  ctx: AuthContext,
  filters: AppointmentListFilters = {},
) {
  const appointments = await prisma.appointment.findMany({
    where: listWhere(ctx, filters),
    include: {
      studentUser: { select: { name: true, email: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return appointments.map((appointment) => serializeAppointment(appointment));
}

export async function getAppointmentById(ctx: AuthContext, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  assertSameSchool(ctx, appointment.schoolId);
  if (ctx.role === 'STUDENT' && appointment.studentUserId !== ctx.userId) {
    throw new AppError(403, 'You can only view your own appointments');
  }

  return serializeAppointment(appointment);
}

async function getMutableAppointment(ctx: AuthContext, appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError(404, 'Appointment not found');
  }

  assertSameSchool(ctx, appointment.schoolId);
  if (ctx.role === 'STUDENT' && appointment.studentUserId !== ctx.userId) {
    throw new AppError(403, 'You can only manage your own appointments');
  }

  if (ctx.role === 'STAFF' && ctx.department) {
    if (appointment.department !== ctx.department) {
      throw new AppError(403, 'You can only manage appointments for your department');
    }
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw new AppError(400, 'This appointment is already cancelled');
  }

  return appointment;
}

export type CreateAppointmentInput = {
  title: string;
  department: string;
  purpose?: string;
  location?: string;
  staffName?: string;
  scheduledAt: string;
  deadline?: string;
  ticketNumber?: string;
  bringItems?: string[];
  studentUserId?: string;
};

export async function createAppointment(
  ctx: AuthContext,
  input: CreateAppointmentInput,
) {
  const studentUserId = input.studentUserId ?? ctx.userId;
  assertCanCreateTicketFor(ctx, studentUserId);

  const student = await prisma.user.findFirst({
    where: { id: studentUserId, schoolId: ctx.schoolId, role: 'STUDENT' },
  });
  if (!student) {
    throw new AppError(400, 'Invalid student for this school');
  }

  const slot = await assertSlotAvailable(
    ctx,
    input.department,
    input.scheduledAt,
  );

  const appointment = await prisma.appointment.create({
    data: {
      title: input.title,
      department: slot.department,
      purpose: input.purpose,
      location: input.location ?? slot.defaultLocation,
      staffName: input.staffName,
      schoolId: ctx.schoolId,
      studentUserId,
      ticketNumber: input.ticketNumber,
      scheduledAt: slot.scheduledAt,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      bringItems: input.bringItems?.length
        ? JSON.stringify(input.bringItems)
        : undefined,
      barColor: pickBarColor(slot.department),
      status: AppointmentStatus.SCHEDULED,
    },
  });

  await logAction(ctx.userId, 'appointment.create', {
    appointmentId: appointment.id,
    title: appointment.title,
  });

  return serializeAppointment(appointment);
}

export async function rescheduleAppointment(
  ctx: AuthContext,
  appointmentId: string,
  scheduledAtIso: string,
) {
  const existing = await getMutableAppointment(ctx, appointmentId);
  const slot = await assertSlotAvailable(
    ctx,
    existing.department,
    scheduledAtIso,
    existing.id,
  );

  const appointment = await prisma.appointment.update({
    where: { id: existing.id },
    data: { scheduledAt: slot.scheduledAt, status: AppointmentStatus.SCHEDULED },
  });

  await logAction(ctx.userId, 'appointment.reschedule', {
    appointmentId: appointment.id,
    scheduledAt: appointment.scheduledAt.toISOString(),
  });

  return serializeAppointment(appointment);
}

export async function cancelAppointment(ctx: AuthContext, appointmentId: string) {
  const existing = await getMutableAppointment(ctx, appointmentId);

  const appointment = await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: AppointmentStatus.CANCELLED },
  });

  await logAction(ctx.userId, 'appointment.cancel', {
    appointmentId: appointment.id,
  });

  return serializeAppointment(appointment);
}

function isCompletedAppointment(
  status: AppointmentStatus,
  scheduledAt: Date,
) {
  if (status === AppointmentStatus.CANCELLED) return false;
  if (status === AppointmentStatus.COMPLETED) return true;
  return scheduledAt.getTime() < Date.now();
}

export async function deleteAppointment(ctx: AuthContext, appointmentId: string) {
  const existing = await getMutableAppointment(ctx, appointmentId);

  if (ctx.role !== 'STUDENT') {
    throw new AppError(403, 'Only students can remove completed appointments');
  }

  if (!isCompletedAppointment(existing.status, existing.scheduledAt)) {
    throw new AppError(400, 'Only completed appointments can be removed');
  }

  await prisma.appointment.delete({
    where: { id: existing.id },
  });

  await logAction(ctx.userId, 'appointment.delete', {
    appointmentId: existing.id,
  });

  return { id: appointmentId };
}

function pickBarColor(department: string) {
  const lower = department.toLowerCase();
  if (lower.includes('health')) return '#14B8A6';
  if (lower.includes('guidance') || lower.includes('counsel')) return '#F59E0B';
  if (lower.includes('registrar')) return '#2E5BA8';
  if (lower.includes('it')) return '#6366F1';
  if (lower.includes('cashier') || lower.includes('finance')) return '#8B5CF6';
  return '#2E5BA8';
}

export async function getAppointmentSummary(ctx: AuthContext) {
  const all = await listAppointments(ctx, { status: 'all' });
  const upcoming = all.filter((item) => item.status === 'upcoming');
  const completed = all.filter((item) => item.status === 'completed');
  const next = upcoming[0] ?? null;

  return {
    upcomingCount: upcoming.length,
    completedCount: completed.length,
    nextAppointment: next
      ? {
          label: `${next.date.replace(', 2026', '')}`,
          title: next.title,
        }
      : null,
    reminder: next
      ? `Reminder: ${next.title} on ${next.date} at ${next.time}${next.location ? `, ${next.location}` : ''}`
      : null,
  };
}
