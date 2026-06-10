import {
  AppointmentStatus,
  TicketStatus,
  TicketUrgency,
  type Ticket,
} from '@prisma/client';
import { prisma } from '../lib/db.js';
import {
  type AuthContext,
  assertCanUpdateTicket,
  assertCanViewTicket,
  assertStaff,
  assertStaffDepartmentAccess,
  AppError,
  staffDepartmentScope,
} from '../lib/permissions.js';
import { logAction } from './actionLogService.js';
import {
  buildAiCreatedTrackSteps,
  mergeDetailPayload,
  serializeTicketDetail,
} from './ticketService.js';
import { notifyUser } from './ticketNotificationService.js';
import {
  createAppointment,
  rescheduleAppointment,
} from './appointmentService.js';
import { assertSlotAvailable } from './appointmentAvailabilityService.js';

const STAFF_STATUS_API: Record<TicketStatus, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'progress',
  PENDING: 'sched',
  RESOLVED: 'resolved',
};

const STAFF_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Action Needed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Scheduled',
  RESOLVED: 'Resolved',
};

const URGENCY_API: Record<TicketUrgency, string> = {
  LOW: 'low',
  MEDIUM: 'med',
  HIGH: 'high',
};

const URGENCY_LABELS: Record<TicketUrgency, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

function parseDetailPayload(ticket: Ticket) {
  if (!ticket.detailPayload) return null;
  try {
    return JSON.parse(ticket.detailPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatDisplayDateTime(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatQueueTime(date: Date) {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return sameDay ? `Today, ${time}` : formatDisplayDateTime(date);
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function buildStudentTags(
  student: {
    studentNumber: string | null;
    program: string | null;
    healthFlags: string | null;
  } | null,
  holdCount: number,
) {
  const tags: Array<{ label: string; bg: string; color: string }> = [];

  if (student?.studentNumber) {
    tags.push({ label: student.studentNumber, bg: '#F1F5F9', color: '#475569' });
  }
  if (student?.program) {
    tags.push({ label: student.program, bg: '#EFF6FF', color: '#2563EB' });
  }
  if (holdCount > 0) {
    tags.push({ label: 'Active hold', bg: '#FEF3C7', color: '#B45309' });
  }

  let healthFlags: string[] = [];
  if (student?.healthFlags) {
    try {
      const parsed = JSON.parse(student.healthFlags) as unknown;
      healthFlags = Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === 'string')
        : [];
    } catch {
      healthFlags = [];
    }
  }

  if (healthFlags.length === 0) {
    tags.push({ label: 'No prior health flags', bg: '#F0FDF4', color: '#15803D' });
  }

  return tags;
}

function buildSuggestedSteps(ticket: Ticket, detail: Record<string, unknown> | null) {
  const trackSteps = Array.isArray(detail?.trackSteps) ? detail.trackSteps : [];
  if (trackSteps.length > 0) {
    return trackSteps
      .filter((step) => typeof step === 'object' && step !== null)
      .map((step) => {
        const record = step as Record<string, unknown>;
        const label = typeof record.label === 'string' ? record.label : 'Step';
        const sub = typeof record.sub === 'string' ? record.sub : undefined;
        return {
          text: sub ? `${label} — ${sub}` : label,
          tag: record.state === 'active' ? 'current' : undefined,
        };
      });
  }

  return [
    { text: `Review ticket concern: ${ticket.concern}` },
    { text: `Contact student via Campus360 if more information is needed` },
    { text: `Update ticket status when resolved` },
  ];
}

function buildAiSummary(ticket: Ticket, detail: Record<string, unknown> | null) {
  const updates = Array.isArray(detail?.aiUpdates) ? detail.aiUpdates : [];
  if (updates.length > 0) {
    const first = updates[0] as Record<string, unknown>;
    if (typeof first.body === 'string') return first.body;
  }
  return `Ticket ${ticket.concern} was routed to ${ticket.department}. Review details and take the next staff action.`;
}

type TicketWithStudent = Ticket & {
  studentUser: { id: string; name: string; email: string };
  student?: {
    studentNumber: string | null;
    program: string | null;
    healthFlags: string | null;
  } | null;
};

export function serializeStaffQueueTicket(
  ticket: TicketWithStudent,
  ticketsThisSem: number,
  holdCount: number,
  appointmentId: string | null = null,
) {
  const detail = parseDetailPayload(ticket);
  const appointment =
    detail && typeof detail.appointment === 'object'
      ? (detail.appointment as Record<string, unknown>)
      : null;

  const appointmentLabel =
    typeof appointment?.datetime === 'string'
      ? appointment.datetime
      : ticket.scheduledDate
        ? formatDisplayDateTime(ticket.scheduledDate)
        : 'Not scheduled';

  const scheduledLabel =
    ticket.status === TicketStatus.PENDING && ticket.scheduledDate
      ? `Scheduled · ${formatShortDate(ticket.scheduledDate)}`
      : undefined;

  return {
    id: `#${ticket.ticketNumber}`,
    ticketNumber: ticket.ticketNumber,
    time: formatQueueTime(ticket.updatedAt),
    concern: ticket.concern,
    studentName: ticket.studentUser.name,
    studentEmail: ticket.studentUser.email,
    status: STAFF_STATUS_API[ticket.status],
    statusLabel: STAFF_STATUS_LABELS[ticket.status],
    urgency: URGENCY_API[ticket.urgency],
    urgencyLabel: URGENCY_LABELS[ticket.urgency],
    aiTriaged: Array.isArray(detail?.aiUpdates) && detail.aiUpdates.length > 0,
    submittedAt: `Submitted ${formatDisplayDateTime(ticket.createdAt)}`,
    scheduledLabel,
    aiSummary: buildAiSummary(ticket, detail),
    staffNotes: ticket.staffNotes,
    student: {
      initials: initials(ticket.studentUser.name),
      program: ticket.student?.program ?? 'Student',
      studentId: ticket.student?.studentNumber ?? ticket.studentUser.id,
      tags: buildStudentTags(ticket.student ?? null, holdCount),
      ticketsThisSem,
    },
    isTaken: Boolean(ticket.assignedStaffUserId),
    assignedStaffUserId: ticket.assignedStaffUserId,
    isClosed: ticket.status === TicketStatus.RESOLVED,
    appointmentId,
    info: {
      purpose: ticket.title ?? ticket.concern,
      deadline: ticket.deadline ? formatShortDate(ticket.deadline) : '—',
      deadlineWarn:
        !!ticket.deadline && ticket.deadline.getTime() < Date.now() + 7 * 86400000,
      appointment: appointmentLabel,
      assignedTo: ticket.assignedTo ?? 'Unassigned',
    },
    steps: buildSuggestedSteps(ticket, detail),
  };
}

export type StaffQueueFilters = {
  status?: string;
  urgency?: string;
  department?: string;
  limit?: number;
  includeResolved?: boolean;
};

const STATUS_FILTER_MAP: Record<string, TicketStatus> = {
  open: TicketStatus.OPEN,
  progress: TicketStatus.IN_PROGRESS,
  sched: TicketStatus.PENDING,
  pending: TicketStatus.PENDING,
  resolved: TicketStatus.RESOLVED,
};

const URGENCY_FILTER_MAP: Record<string, TicketUrgency> = {
  low: TicketUrgency.LOW,
  med: TicketUrgency.MEDIUM,
  medium: TicketUrgency.MEDIUM,
  high: TicketUrgency.HIGH,
};

export async function listStaffQueueTickets(
  ctx: AuthContext,
  filters: StaffQueueFilters = {},
) {
  assertStaff(ctx);

  const where: {
    schoolId: string;
    status?: TicketStatus | { not: TicketStatus };
    urgency?: TicketUrgency;
    department?: string;
  } = { schoolId: ctx.schoolId };

  if (filters.status && filters.status !== 'all') {
    const mapped = STATUS_FILTER_MAP[filters.status];
    if (mapped) {
      where.status = mapped;
    }
  } else if (filters.includeResolved !== true) {
    where.status = { not: TicketStatus.RESOLVED };
  }

  if (filters.urgency && filters.urgency !== 'all') {
    const mapped = URGENCY_FILTER_MAP[filters.urgency];
    if (mapped) where.urgency = mapped;
  }

  const scopedDepartment = staffDepartmentScope(ctx);
  if (scopedDepartment) {
    where.department = scopedDepartment;
  } else if (filters.department) {
    where.department = filters.department;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      studentUser: {
        select: {
          id: true,
          name: true,
          email: true,
          student: {
            select: {
              studentNumber: true,
              program: true,
              healthFlags: true,
            },
          },
        },
      },
    },
    orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }],
    take: filters.limit,
  });

  const linkedAppointments = await prisma.appointment.findMany({
    where: {
      schoolId: ctx.schoolId,
      ticketNumber: { in: tickets.map((ticket) => ticket.ticketNumber) },
      status: AppointmentStatus.SCHEDULED,
    },
    select: { id: true, ticketNumber: true },
  });
  const appointmentIdByTicket = new Map(
    linkedAppointments.map((row) => [row.ticketNumber, row.id]),
  );

  const rows = await Promise.all(
    tickets.map(async (ticket) => {
      const [ticketsThisSem, holdCount] = await Promise.all([
        prisma.ticket.count({
          where: {
            studentUserId: ticket.studentUserId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), 0, 1),
            },
          },
        }),
        prisma.studentHold.count({
          where: { studentUserId: ticket.studentUserId, status: 'ACTIVE' },
        }),
      ]);

      return serializeStaffQueueTicket(
        {
          ...ticket,
          student: ticket.studentUser.student,
        },
        ticketsThisSem,
        holdCount,
        appointmentIdByTicket.get(ticket.ticketNumber) ?? null,
      );
    }),
  );

  return rows;
}

async function findLinkedAppointmentId(
  schoolId: string,
  ticketNumber: string,
  department: string,
) {
  const linked = await prisma.appointment.findFirst({
    where: {
      schoolId,
      ticketNumber,
      department,
      status: AppointmentStatus.SCHEDULED,
    },
    select: { id: true },
  });
  return linked?.id ?? null;
}

async function getStaffTicketRecord(ctx: AuthContext, ticketNumber: string) {
  const normalized = ticketNumber.replace(/^#/, '');
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber: normalized },
    include: {
      studentUser: {
        select: {
          id: true,
          name: true,
          email: true,
          student: {
            select: {
              studentNumber: true,
              program: true,
              healthFlags: true,
            },
          },
        },
      },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          authorUser: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  assertCanViewTicket(ctx, ticket);
  return ticket;
}

export async function getStaffTicketByNumber(ctx: AuthContext, ticketNumber: string) {
  const ticket = await getStaffTicketRecord(ctx, ticketNumber);
  const [ticketsThisSem, holdCount] = await Promise.all([
    prisma.ticket.count({
      where: {
        studentUserId: ticket.studentUserId,
        createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),
    prisma.studentHold.count({
      where: { studentUserId: ticket.studentUserId, status: 'ACTIVE' },
    }),
  ]);

  const appointmentId = await findLinkedAppointmentId(
    ctx.schoolId,
    ticket.ticketNumber,
    ticket.department,
  );

  return {
    ...serializeTicketDetail(ticket, ticket.replies, ctx),
    queue: serializeStaffQueueTicket(
      { ...ticket, student: ticket.studentUser.student },
      ticketsThisSem,
      holdCount,
      appointmentId,
    ),
  };
}

export async function takeStaffTicket(ctx: AuthContext, ticketNumber: string) {
  assertCanUpdateTicket(ctx);

  const existing = await getStaffTicketRecord(ctx, ticketNumber);
  assertStaffDepartmentAccess(ctx, existing.department);

  if (existing.assignedStaffUserId) {
    throw new AppError(409, 'This ticket has already been taken by another staff member');
  }

  if (existing.status === TicketStatus.RESOLVED) {
    throw new AppError(400, 'Cannot take a resolved ticket');
  }

  const staff = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { name: true },
  });

  const now = new Date();
  const timeLabel = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const ticket = await prisma.ticket.update({
    where: { id: existing.id },
    data: {
      assignedStaffUserId: ctx.userId,
      assignedTo: staff.name,
      status:
        existing.status === TicketStatus.OPEN
          ? TicketStatus.IN_PROGRESS
          : existing.status,
      updatedAt: now,
      detailPayload: mergeDetailPayload(existing, (detail) => {
        const timeline = Array.isArray(detail.timeline) ? [...detail.timeline] : [];
        if (timeline.length > 0) {
          timeline[timeline.length - 1] = {
            ...timeline[timeline.length - 1],
            showLine: true,
          };
        }
        timeline.push({
          title: 'Ticket taken by staff',
          desc: `${staff.name} is now handling this ticket. You can send follow-up messages.`,
          time: timeLabel,
          dotColor: '#2563EB',
          showLine: false,
        });

        return {
          ...detail,
          timeline,
          trackSteps: buildAiCreatedTrackSteps(existing.department, staff.name),
        };
      }),
    },
    include: {
      studentUser: {
        select: {
          id: true,
          name: true,
          email: true,
          student: {
            select: {
              studentNumber: true,
              program: true,
              healthFlags: true,
            },
          },
        },
      },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          authorUser: { select: { name: true, role: true } },
        },
      },
    },
  });

  await logAction(ctx.userId, 'ticket.take', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
  });

  await notifyUser(ticket.studentUserId, {
    title: 'A staff member is handling your ticket',
    body: `${staff.name} from ${ticket.department} took ticket #${ticket.ticketNumber}. You can now send follow-up messages.`,
    link: `/tickets/${ticket.ticketNumber}`,
  });

  const [ticketsThisSem, holdCount] = await Promise.all([
    prisma.ticket.count({
      where: {
        studentUserId: ticket.studentUserId,
        createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),
    prisma.studentHold.count({
      where: { studentUserId: ticket.studentUserId, status: 'ACTIVE' },
    }),
  ]);

  const appointmentId = await findLinkedAppointmentId(
    ctx.schoolId,
    ticket.ticketNumber,
    ticket.department,
  );

  return {
    ...serializeTicketDetail(ticket, ticket.replies, ctx),
    queue: serializeStaffQueueTicket(
      { ...ticket, student: ticket.studentUser.student },
      ticketsThisSem,
      holdCount,
      appointmentId,
    ),
  };
}

export async function rescheduleStaffTicket(
  ctx: AuthContext,
  ticketNumber: string,
  scheduledAtIso: string,
) {
  assertCanUpdateTicket(ctx);

  const existing = await getStaffTicketRecord(ctx, ticketNumber);
  assertStaffDepartmentAccess(ctx, existing.department);

  if (existing.status === TicketStatus.RESOLVED) {
    throw new AppError(400, 'This ticket is already closed');
  }

  const linkedAppointment = await prisma.appointment.findFirst({
    where: {
      schoolId: ctx.schoolId,
      ticketNumber: existing.ticketNumber,
      department: existing.department,
      status: AppointmentStatus.SCHEDULED,
    },
  });

  if (linkedAppointment) {
    await rescheduleAppointment(ctx, linkedAppointment.id, scheduledAtIso);
  } else {
    await createAppointment(ctx, {
      title: existing.title ?? existing.concern,
      department: existing.department,
      purpose: existing.title ?? existing.concern,
      scheduledAt: scheduledAtIso,
      ticketNumber: existing.ticketNumber,
      studentUserId: existing.studentUserId,
      staffName: existing.assignedTo ?? undefined,
    });
  }

  const slot = await assertSlotAvailable(
    ctx,
    existing.department,
    scheduledAtIso,
    linkedAppointment?.id,
  );

  await prisma.ticket.update({
    where: { id: existing.id },
    data: {
      scheduledDate: slot.scheduledAt,
      status: TicketStatus.PENDING,
      updatedAt: new Date(),
    },
  });

  await notifyUser(existing.studentUserId, {
    title: 'Appointment rescheduled',
    body: `Your appointment for ticket #${existing.ticketNumber} was rescheduled to ${slot.scheduledAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}.`,
    link: `/tickets/${existing.ticketNumber}`,
  });

  return getStaffTicketByNumber(ctx, ticketNumber);
}

export type UpdateStaffTicketInput = {
  status?: TicketStatus;
  assignedTo?: string;
  staffNotes?: string;
};

export async function updateStaffTicket(
  ctx: AuthContext,
  ticketNumber: string,
  input: UpdateStaffTicketInput,
) {
  assertCanUpdateTicket(ctx);

  const existing = await getStaffTicketRecord(ctx, ticketNumber);

  const ticket = await prisma.ticket.update({
    where: { id: existing.id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      ...(input.staffNotes !== undefined ? { staffNotes: input.staffNotes } : {}),
      updatedAt: new Date(),
    },
    include: {
      studentUser: {
        select: {
          id: true,
          name: true,
          email: true,
          student: {
            select: {
              studentNumber: true,
              program: true,
              healthFlags: true,
            },
          },
        },
      },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          authorUser: { select: { name: true, role: true } },
        },
      },
    },
  });

  await logAction(ctx.userId, 'ticket.staff.update', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ...input,
  });

  if (input.status === TicketStatus.RESOLVED) {
    await notifyUser(ticket.studentUserId, {
      title: 'Ticket resolved',
      body: `Your ticket #${ticket.ticketNumber} with ${ticket.department} has been marked resolved.`,
      link: `/tickets/${ticket.ticketNumber}`,
    });
  }

  const [ticketsThisSem, holdCount] = await Promise.all([
    prisma.ticket.count({
      where: {
        studentUserId: ticket.studentUserId,
        createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    }),
    prisma.studentHold.count({
      where: { studentUserId: ticket.studentUserId, status: 'ACTIVE' },
    }),
  ]);

  const appointmentId = await findLinkedAppointmentId(
    ctx.schoolId,
    ticket.ticketNumber,
    ticket.department,
  );

  return {
    ...serializeTicketDetail(ticket, ticket.replies, ctx),
    queue: serializeStaffQueueTicket(
      { ...ticket, student: ticket.studentUser.student },
      ticketsThisSem,
      holdCount,
      appointmentId,
    ),
  };
}
