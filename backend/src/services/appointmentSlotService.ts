import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { isPastDateTime } from '../lib/demoDate.js';
import { normalizeDepartmentLabel } from '../lib/departments.js';
import {
  type AuthContext,
  AppError,
  assertStaff,
  assertStaffDepartmentAccess,
} from '../lib/permissions.js';

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function staffDepartment(ctx: AuthContext) {
  assertStaff(ctx);
  if (!ctx.department) {
    throw new AppError(403, 'Your staff account is not assigned to a department');
  }
  return normalizeDepartmentLabel(ctx.department);
}

function monthRange(year: number, monthIndex: number, day?: number) {
  if (day !== undefined) {
    return {
      start: new Date(year, monthIndex, day, 0, 0, 0, 0),
      end: new Date(year, monthIndex, day + 1, 0, 0, 0, 0),
    };
  }
  return {
    start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(year, monthIndex + 1, 1, 0, 0, 0, 0),
  };
}

async function isSlotBooked(
  schoolId: string,
  department: string,
  startsAt: Date,
  excludeSlotId?: string,
) {
  const slot = excludeSlotId
    ? await prisma.appointmentSlot.findUnique({ where: { id: excludeSlotId } })
    : null;

  const scheduledAt = slot?.startsAt ?? startsAt;

  const booked = await prisma.appointment.findFirst({
    where: {
      schoolId,
      department,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt,
    },
  });

  return Boolean(booked);
}

function serializeStaffSlot(
  slot: { id: string; startsAt: Date; isOpen: boolean },
  booked: boolean,
) {
  return {
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    dateLabel: formatDateLabel(slot.startsAt),
    timeLabel: formatTimeLabel(slot.startsAt),
    isOpen: slot.isOpen,
    isBooked: booked,
    isPast: isPastDateTime(slot.startsAt),
  };
}

export async function listStaffAppointmentSlots(
  ctx: AuthContext,
  filters: { year: number; month: number; day?: number },
) {
  const department = staffDepartment(ctx);
  const { start, end } = monthRange(filters.year, filters.month, filters.day);

  const slots = await prisma.appointmentSlot.findMany({
    where: {
      schoolId: ctx.schoolId,
      department,
      startsAt: { gte: start, lt: end },
    },
    orderBy: { startsAt: 'asc' },
  });

  const bookedTimes = new Set(
    (
      await prisma.appointment.findMany({
        where: {
          schoolId: ctx.schoolId,
          department,
          status: AppointmentStatus.SCHEDULED,
          scheduledAt: { gte: start, lt: end },
        },
        select: { scheduledAt: true },
      })
    ).map((row) => row.scheduledAt.getTime()),
  );

  return slots.map((slot) =>
    serializeStaffSlot(slot, bookedTimes.has(slot.startsAt.getTime())),
  );
}

export async function createStaffAppointmentSlot(
  ctx: AuthContext,
  input: { startsAt: string },
) {
  const department = staffDepartment(ctx);
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new AppError(400, 'Invalid slot date/time');
  }

  if (isPastDateTime(startsAt)) {
    throw new AppError(400, 'Cannot add a slot in the past');
  }

  const slot = await prisma.appointmentSlot.create({
    data: {
      schoolId: ctx.schoolId,
      department,
      startsAt,
      isOpen: true,
    },
  }).catch((err: { code?: string }) => {
    if (err.code === 'P2002') {
      throw new AppError(409, 'A slot already exists at that date and time');
    }
    throw err;
  });

  const booked = await isSlotBooked(ctx.schoolId, department, slot.startsAt);
  return serializeStaffSlot(slot, booked);
}

export async function updateStaffAppointmentSlot(
  ctx: AuthContext,
  slotId: string,
  input: { startsAt?: string; isOpen?: boolean },
) {
  const department = staffDepartment(ctx);
  const existing = await prisma.appointmentSlot.findUnique({
    where: { id: slotId },
  });

  if (!existing || existing.schoolId !== ctx.schoolId) {
    throw new AppError(404, 'Slot not found');
  }

  assertStaffDepartmentAccess(ctx, existing.department);

  const booked = await isSlotBooked(
    ctx.schoolId,
    existing.department,
    existing.startsAt,
    existing.id,
  );

  if (input.startsAt !== undefined) {
    if (booked) {
      throw new AppError(
        400,
        'This slot is booked. Close it instead of changing the time.',
      );
    }

    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new AppError(400, 'Invalid slot date/time');
    }

    if (isPastDateTime(startsAt)) {
      throw new AppError(400, 'Cannot move a slot to a past date/time');
    }

    const slot = await prisma.appointmentSlot.update({
      where: { id: slotId },
      data: { startsAt },
    });

    return serializeStaffSlot(slot, false);
  }

  if (input.isOpen === undefined) {
    throw new AppError(400, 'No slot changes provided');
  }

  const slot = await prisma.appointmentSlot.update({
    where: { id: slotId },
    data: { isOpen: input.isOpen },
  });

  return serializeStaffSlot(slot, booked);
}

export async function createStaffAppointmentSlotsBatch(
  ctx: AuthContext,
  input: { startsAt: string[] },
) {
  const slots: ReturnType<typeof serializeStaffSlot>[] = [];
  const errors: string[] = [];

  for (const startsAt of input.startsAt) {
    try {
      const slot = await createStaffAppointmentSlot(ctx, { startsAt });
      slots.push(slot);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Failed to add slot');
    }
  }

  if (slots.length === 0 && errors.length > 0) {
    throw new AppError(400, errors[0] ?? 'Failed to add slots');
  }

  return { slots, errors };
}
