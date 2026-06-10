import { AppointmentStatus, HoldStatus, TicketStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';
import {
  type AuthContext,
  assertStaff,
  AppError,
  staffDepartmentScope,
} from '../lib/permissions.js';
import { serializeTicketSummary } from './ticketService.js';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function parseHealthFlags(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export type StaffStudentFilters = {
  holds?: boolean;
  openTickets?: boolean;
  yearLevel?: string;
  program?: string;
};

async function studentStats(userId: string, department?: string | null) {
  const ticketWhere = {
    studentUserId: userId,
    status: { not: TicketStatus.RESOLVED },
    ...(department ? { department } : {}),
  };
  const holdWhere = {
    studentUserId: userId,
    status: HoldStatus.ACTIVE,
    ...(department ? { department } : {}),
  };
  const appointmentWhere = {
    studentUserId: userId,
    status: AppointmentStatus.SCHEDULED,
    scheduledAt: { gte: new Date() },
    ...(department ? { department } : {}),
  };

  const [ticketCount, holdCount, nextAppointment] = await Promise.all([
    prisma.ticket.count({ where: ticketWhere }),
    prisma.studentHold.count({ where: holdWhere }),
    prisma.appointment.findFirst({
      where: appointmentWhere,
      orderBy: { scheduledAt: 'asc' },
    }),
  ]);

  return {
    tickets: ticketCount,
    holds: holdCount,
    appts: nextAppointment ? 1 : 0,
    nextAppointment: nextAppointment
      ? `${formatShortDate(nextAppointment.scheduledAt)} · ${nextAppointment.scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : 'None scheduled',
  };
}

async function studentTouchesDepartment(userId: string, department: string) {
  const [ticketCount, holdCount, appointmentCount] = await Promise.all([
    prisma.ticket.count({ where: { studentUserId: userId, department } }),
    prisma.studentHold.count({
      where: { studentUserId: userId, department, status: HoldStatus.ACTIVE },
    }),
    prisma.appointment.count({
      where: { studentUserId: userId, department },
    }),
  ]);

  return ticketCount + holdCount + appointmentCount > 0;
}

export async function listStudents(ctx: AuthContext, filters: StaffStudentFilters = {}) {
  assertStaff(ctx);
  const department = staffDepartmentScope(ctx);

  const students = await prisma.student.findMany({
    where: { schoolId: ctx.schoolId },
    include: {
      user: true,
    },
    orderBy: { user: { name: 'asc' } },
  });

  const rows = await Promise.all(
    students.map(async (student) => {
      if (department) {
        const relevant = await studentTouchesDepartment(student.userId, department);
        if (!relevant) return null;
      }

      const stats = await studentStats(student.userId, department);
      const healthFlags = parseHealthFlags(student.healthFlags);
      const holds = await prisma.studentHold.findMany({
        where: {
          studentUserId: student.userId,
          status: HoldStatus.ACTIVE,
          ...(department ? { department } : {}),
        },
      });

      return {
        id: student.studentNumber ?? student.id,
        userId: student.userId,
        initials: initials(student.user.name),
        name: student.user.name,
        email: student.user.email,
        phone: student.phone,
        yearLevel: student.yearLevel ?? student.grade,
        program: student.program,
        college: student.college,
        sub: [
          student.studentNumber,
          student.yearLevel ?? student.grade,
          student.program,
        ]
          .filter(Boolean)
          .join(' · '),
        enrollmentStatus:
          holds.length > 0 ? 'Enrolled — hold pending' : 'Enrolled',
        enrollmentWarn: holds.length > 0,
        hasHold: holds.length > 0,
        hasOpenTicket: stats.tickets > 0,
        hasHealthFlag: healthFlags.length > 0,
        stats,
        listTags: [
          ...(holds.length > 0
            ? [{ label: 'Active hold', type: 'hold' as const }]
            : []),
          ...(stats.appts > 0
            ? [{ label: `Next appt ${stats.nextAppointment}`, type: 'sched' as const }]
            : []),
        ],
      };
    }),
  );

  return rows.filter((row): row is NonNullable<typeof row> => {
    if (!row) return false;
    if (filters.holds && !row.hasHold) return false;
    if (filters.openTickets && !row.hasOpenTicket) return false;
    if (
      filters.yearLevel &&
      !(row.yearLevel ?? '').toLowerCase().includes(filters.yearLevel.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.program &&
      !(row.program ?? '').toLowerCase().includes(filters.program.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

export async function getStudentProfile(ctx: AuthContext, studentKey: string) {
  assertStaff(ctx);
  const department = staffDepartmentScope(ctx);

  const student = await prisma.student.findFirst({
    where: {
      schoolId: ctx.schoolId,
      OR: [{ studentNumber: studentKey }, { userId: studentKey }, { id: studentKey }],
    },
    include: { user: true },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  if (department) {
    const relevant = await studentTouchesDepartment(student.userId, department);
    if (!relevant) {
      throw new AppError(403, 'This student is not in your department');
    }
  }

  const departmentFilter = department ? { department } : {};

  const [holds, tickets, appointments, stats] = await Promise.all([
    prisma.studentHold.findMany({
      where: {
        studentUserId: student.userId,
        status: HoldStatus.ACTIVE,
        ...departmentFilter,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ticket.findMany({
      where: { studentUserId: student.userId, ...departmentFilter },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.appointment.findMany({
      where: { studentUserId: student.userId, ...departmentFilter },
      orderBy: { scheduledAt: 'asc' },
    }),
    studentStats(student.userId, department),
  ]);

  const healthFlags = parseHealthFlags(student.healthFlags);

  return {
    id: student.studentNumber ?? student.id,
    userId: student.userId,
    initials: initials(student.user.name),
    name: student.user.name,
    email: student.user.email,
    phone: student.phone,
    yearLevel: student.yearLevel ?? student.grade,
    program: student.program,
    college: student.college,
    enrollmentStatus: holds.length > 0 ? 'Enrolled — hold pending' : 'Enrolled',
    enrollmentWarn: holds.length > 0,
    stats,
    holds: holds.map((hold) => ({
      id: hold.id,
      title: hold.title,
      description: hold.description,
      department: hold.department,
      label: hold.description ? `${hold.title} — ${hold.description}` : hold.title,
    })),
    tickets: tickets.map(serializeTicketSummary),
    appointments: appointments.map((appt) => ({
      id: appt.id,
      title: appt.title,
      department: appt.department,
      scheduledAt: appt.scheduledAt.toISOString(),
      status: appt.status.toLowerCase(),
    })),
    healthNotes: healthFlags.map((flag) => ({ text: flag })),
    profileTags: [
      ...(student.studentNumber
        ? [{ label: `Student ID: ${student.studentNumber}` }]
        : []),
      ...(holds.length > 0 ? [{ label: 'Tuition hold active', type: 'hold' }] : []),
      ...(healthFlags.length === 0
        ? [{ label: 'No prior health flags', type: 'clear' }]
        : healthFlags.map((flag) => ({ label: flag, type: 'flag' }))),
    ],
  };
}
