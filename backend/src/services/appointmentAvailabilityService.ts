import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { DEMO_TODAY, getDemoTodayStart } from '../lib/demoDate.js';
import {
  findDepartment,
  listDepartmentsForApi,
  normalizeDepartmentLabel,
} from '../lib/departments.js';
import { type AuthContext, AppError } from '../lib/permissions.js';

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

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

function normalizeMonthIndex(month: number) {
  if (month >= 1 && month <= 12) return month - 1;
  if (month >= 0 && month <= 11) return month;
  throw new AppError(400, 'month must be 0-11 (API) or 1-12 (calendar month)');
}

export function parseAppointmentTimeInput(raw: string) {
  const trimmed = raw.trim().toLowerCase();
  const ampm = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let hour = Number.parseInt(ampm[1], 10);
    const minute = ampm[2] ? Number.parseInt(ampm[2], 10) : 0;
    const suffix = ampm[3].toLowerCase();
    if (suffix === 'pm' && hour !== 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    return { hour, minute };
  }

  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    return {
      hour: Number.parseInt(h24[1], 10),
      minute: Number.parseInt(h24[2], 10),
    };
  }

  throw new AppError(400, `Could not parse time "${raw}". Use formats like "2:00 PM" or "14:00".`);
}

export function parseAppointmentDateInput(raw: string, defaultYear = DEMO_TODAY.year) {
  const cleaned = raw.trim().toLowerCase().replaceAll(',', '');
  const named = cleaned.match(
    /^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/,
  );
  if (named) {
    const month = MONTH_NAME_TO_INDEX[named[1]];
    if (month === undefined) {
      throw new AppError(400, `Could not parse month in date "${raw}"`);
    }
    return {
      year: named[3] ? Number.parseInt(named[3], 10) : defaultYear,
      month,
      day: Number.parseInt(named[2], 10),
    };
  }

  const numeric = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (numeric) {
    return {
      year: Number.parseInt(numeric[1], 10),
      month: Number.parseInt(numeric[2], 10) - 1,
      day: Number.parseInt(numeric[3], 10),
    };
  }

  const slash = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (slash) {
    return {
      year: slash[3] ? Number.parseInt(slash[3], 10) : defaultYear,
      month: Number.parseInt(slash[1], 10) - 1,
      day: Number.parseInt(slash[2], 10),
    };
  }

  throw new AppError(400, `Could not parse date "${raw}". Use formats like "June 13" or "2026-06-13".`);
}

function sameLocalDateTime(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

export type ResolveSlotInput = {
  scheduledAt?: string;
  year?: number;
  month?: number;
  day?: number;
  time?: string;
  date?: string;
};

async function findSlotByLocalDateTime(
  ctx: AuthContext,
  departmentLabel: string,
  localDate: Date,
  excludeAppointmentId?: string,
) {
  const dayStart = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    0,
    0,
    0,
    0,
  );
  const dayEnd = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate() + 1,
    0,
    0,
    0,
    0,
  );

  const slots = await prisma.appointmentSlot.findMany({
    where: {
      schoolId: ctx.schoolId,
      department: departmentLabel,
      startsAt: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { startsAt: 'asc' },
  });

  const slot = slots.find((row) => sameLocalDateTime(row.startsAt, localDate));
  if (!slot) {
    return null;
  }

  const booked = await prisma.appointment.findFirst({
    where: {
      schoolId: ctx.schoolId,
      department: departmentLabel,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: slot.startsAt,
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  });

  if (booked) {
    throw new AppError(400, 'That slot was just booked. Please choose another time.');
  }

  return slot;
}

async function suggestNearbySlots(
  ctx: AuthContext,
  departmentLabel: string,
  year: number,
  monthIndex: number,
  day: number,
) {
  const availability = await getDepartmentAvailability(ctx, {
    department: departmentLabel,
    year,
    month: monthIndex,
  });

  const sameDay = availability.slots.filter((slot) => slot.day === day);
  if (sameDay.length > 0) {
    return sameDay
      .map((slot) => `${slot.dateLabel} at ${slot.timeLabel}`)
      .join(', ');
  }

  return availability.slots
    .slice(0, 6)
    .map((slot) => `${slot.dateLabel} at ${slot.timeLabel}`)
    .join(', ');
}

export async function resolveBookableSlot(
  ctx: AuthContext,
  departmentInput: string,
  input: ResolveSlotInput,
  excludeAppointmentId?: string,
) {
  const department = normalizeDepartmentLabel(departmentInput);
  const dept = findDepartment(department);
  if (!dept) {
    throw new AppError(400, 'Unknown department');
  }

  if (input.scheduledAt) {
    const exact = new Date(input.scheduledAt);
    if (!Number.isNaN(exact.getTime())) {
      const exactSlot = await findSlotByLocalDateTime(
        ctx,
        dept.label,
        exact,
        excludeAppointmentId,
      );
      if (exactSlot) {
        return {
          department: dept.label,
          scheduledAt: exactSlot.startsAt,
          defaultLocation: dept.defaultLocation,
        };
      }
    }
  }

  let year = input.year ?? DEMO_TODAY.year;
  let monthIndex =
    input.month !== undefined ? normalizeMonthIndex(input.month) : undefined;
  let day = input.day;
  const timeRaw = input.time?.trim();

  if (input.date) {
    const parsed = parseAppointmentDateInput(input.date, year);
    year = parsed.year;
    monthIndex = parsed.month;
    day = parsed.day;
  }

  if (monthIndex === undefined || day === undefined || !timeRaw) {
    throw new AppError(
      400,
      'Provide a valid slot using startsAt from get_availability, or send date/day + month + year + time (e.g. date="June 15", time="2:00 PM").',
    );
  }

  const { hour, minute } = parseAppointmentTimeInput(timeRaw);
  const localDate = new Date(year, monthIndex, day, hour, minute, 0, 0);
  const slot = await findSlotByLocalDateTime(
    ctx,
    dept.label,
    localDate,
    excludeAppointmentId,
  );

  if (!slot) {
    const suggestions = await suggestNearbySlots(
      ctx,
      dept.label,
      year,
      monthIndex,
      day,
    );
    throw new AppError(
      400,
      `${formatDateLabel(localDate)} at ${formatTimeLabel(localDate)} is not available. Open slots include: ${suggestions}`,
    );
  }

  return {
    department: dept.label,
    scheduledAt: slot.startsAt,
    defaultLocation: dept.defaultLocation,
  };
}

export function listAppointmentDepartments() {
  return listDepartmentsForApi();
}

export type AvailabilityFilters = {
  department: string;
  year: number;
  month: number;
  day?: number;
  excludeAppointmentId?: string;
};

async function getBookedTimes(
  schoolId: string,
  department: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeAppointmentId?: string,
) {
  const booked = await prisma.appointment.findMany({
    where: {
      schoolId,
      department,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: { gte: rangeStart, lt: rangeEnd },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { scheduledAt: true },
  });

  return new Set(booked.map((row) => row.scheduledAt.getTime()));
}

export async function getDepartmentAvailability(
  ctx: AuthContext,
  filters: AvailabilityFilters,
) {
  const department = normalizeDepartmentLabel(filters.department);
  const dept = findDepartment(department);
  if (!dept) {
    throw new AppError(400, 'Unknown department');
  }

  const rangeStart =
    filters.day !== undefined
      ? new Date(filters.year, filters.month, filters.day, 0, 0, 0, 0)
      : new Date(filters.year, filters.month, 1, 0, 0, 0, 0);

  const rangeEnd =
    filters.day !== undefined
      ? new Date(filters.year, filters.month, filters.day + 1, 0, 0, 0, 0)
      : new Date(filters.year, filters.month + 1, 1, 0, 0, 0, 0);

  const slots = await prisma.appointmentSlot.findMany({
    where: {
      schoolId: ctx.schoolId,
      department: dept.label,
      startsAt: { gte: rangeStart, lt: rangeEnd },
    },
    orderBy: { startsAt: 'asc' },
  });

  const bookedTimes = await getBookedTimes(
    ctx.schoolId,
    dept.label,
    rangeStart,
    rangeEnd,
    filters.excludeAppointmentId,
  );

  const earliestBookable = getDemoTodayStart();

  const availableSlots = slots
    .filter(
      (slot) =>
        slot.startsAt >= earliestBookable &&
        !bookedTimes.has(slot.startsAt.getTime()),
    )
    .map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      day: slot.startsAt.getDate(),
      month: slot.startsAt.getMonth(),
      calendarMonth: slot.startsAt.getMonth() + 1,
      year: slot.startsAt.getFullYear(),
      weekday: slot.startsAt.toLocaleDateString('en-US', { weekday: 'long' }),
      dateLabel: formatDateLabel(slot.startsAt),
      timeLabel: formatTimeLabel(slot.startsAt),
      bookingHint: `Use startsAt "${slot.startsAt.toISOString()}" or date="${formatDateLabel(slot.startsAt)}" time="${formatTimeLabel(slot.startsAt)}"`,
    }));

  const availableDays = [
    ...new Set(availableSlots.map((slot) => slot.day)),
  ].sort((a, b) => a - b);

  const openDatesMap = new Map<
    string,
    {
      dateLabel: string;
      weekday: string;
      day: number;
      calendarMonth: number;
      month: number;
      year: number;
      times: Array<{ timeLabel: string; startsAt: string }>;
    }
  >();

  for (const slot of availableSlots) {
    const key = `${slot.year}-${slot.month}-${slot.day}`;
    const existing = openDatesMap.get(key);
    const timeEntry = { timeLabel: slot.timeLabel, startsAt: slot.startsAt };
    if (existing) {
      existing.times.push(timeEntry);
      continue;
    }
    openDatesMap.set(key, {
      dateLabel: slot.dateLabel,
      weekday: slot.weekday,
      day: slot.day,
      calendarMonth: slot.calendarMonth,
      month: slot.month,
      year: slot.year,
      times: [timeEntry],
    });
  }

  const openDates = [...openDatesMap.values()].sort((a, b) => {
    const aTime = new Date(a.year, a.month, a.day).getTime();
    const bTime = new Date(b.year, b.month, b.day).getTime();
    return aTime - bTime;
  });

  const monthLabel = new Date(filters.year, filters.month, 1).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' },
  );

  return {
    department: dept.label,
    defaultLocation: dept.defaultLocation,
    year: filters.year,
    calendarMonth: filters.month + 1,
    monthIndex: filters.month,
    month: filters.month,
    monthLabel,
    monthIsZeroBased: true,
    weekdaysOnly: true,
    availableDays,
    openDates,
    slots: availableSlots,
    bookingRules:
      'Only offer dates in openDates. Weekends and unlisted dates are NOT available. When booking, copy the exact startsAt from the chosen time slot, or send matching date + time fields.',
    forCopilot: `Listed ${openDates.length} bookable day(s) in ${monthLabel}. Use calendarMonth ${filters.month + 1} to query this month again (June=6, July=7). Only read dates from openDates — each entry includes dateLabel and weekday.`,
  };
}

export async function assertSlotAvailable(
  ctx: AuthContext,
  departmentInput: string,
  scheduledAtIso: string,
  excludeAppointmentId?: string,
) {
  return resolveBookableSlot(
    ctx,
    departmentInput,
    { scheduledAt: scheduledAtIso },
    excludeAppointmentId,
  );
}
