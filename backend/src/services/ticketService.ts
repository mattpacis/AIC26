import {
  TicketStatus,
  TicketUrgency,
  type Ticket,
} from '@prisma/client';
import { prisma } from '../lib/db.js';
import {
  type AuthContext,
  assertCanCreateTicketFor,
  assertCanDeleteTicket,
  assertCanReplyToTicket,
  assertCanResolveTicket,
  assertCanUpdateTicket,
  assertCanViewTicket,
  AppError,
} from '../lib/permissions.js';
import { normalizeTicketDepartmentLabel } from '../lib/departments.js';
import { logAction } from './actionLogService.js';
import {
  notifyDepartmentStaff,
  notifyUser,
} from './ticketNotificationService.js';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Action Needed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Scheduled',
  RESOLVED: 'Resolved',
};

const URGENCY_LABELS: Record<TicketUrgency, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const STATUS_API: Record<TicketStatus, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'progress',
  PENDING: 'pending',
  RESOLVED: 'resolved',
};

const URGENCY_API: Record<TicketUrgency, string> = {
  LOW: 'low',
  MEDIUM: 'med',
  HIGH: 'high',
};

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function parseDetailPayload(ticket: Ticket) {
  if (!ticket.detailPayload) {
    return null;
  }

  try {
    return JSON.parse(ticket.detailPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function serializeTicketSummary(ticket: Ticket) {
  const display = resolveTicketDisplayStatus(ticket);

  return {
    id: `#${ticket.ticketNumber}`,
    ticketNumber: ticket.ticketNumber,
    concern: ticket.concern,
    status: display.status,
    statusLabel: display.statusLabel,
    urgency: URGENCY_API[ticket.urgency],
    urgencyLabel: URGENCY_LABELS[ticket.urgency],
    department: ticket.department,
    lastUpdate: formatDisplayDate(ticket.updatedAt),
    updatedAt: ticket.updatedAt.toISOString(),
    scheduledDate: ticket.scheduledDate?.toISOString() ?? null,
  };
}

type TicketReplyRecord = {
  id: string;
  content: string;
  createdAt: Date;
  authorUser: { name: string; role: string };
};

function isAiCreatedTicket(detail: Record<string, unknown> | null) {
  return Array.isArray(detail?.aiUpdates) && detail.aiUpdates.length > 0;
}

export function buildAiCreatedTrackSteps(department: string, assignedTo?: string | null) {
  const steps = [
    { label: 'Submitted', sub: 'Just now', state: 'done', lineState: 'done', icon: 'check' },
    {
      label: 'AI triaged',
      sub: 'Just now',
      state: 'done',
      lineState: 'done',
      icon: 'check',
    },
    {
      label: 'Routed to dept.',
      sub: department,
      state: assignedTo ? 'done' : 'active',
      lineState: assignedTo ? 'done' : 'active',
      icon: assignedTo ? 'check' : 'clock',
    },
  ];

  if (assignedTo) {
    steps.push({
      label: 'Assigned to staff',
      sub: assignedTo,
      state: 'active',
      lineState: 'active',
      icon: 'clock',
    });
  }

  steps.push({
    label: 'Resolved',
    sub: 'Pending',
    state: 'pending',
    lineState: 'pending',
    icon: 'circle-check',
  });

  return steps;
}

type TrackStep = {
  label: string;
  sub: string;
  state: string;
  lineState: string;
  icon: string;
};

function asTrackSteps(value: unknown): TrackStep[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (step): step is TrackStep =>
      typeof step === 'object' &&
      step !== null &&
      typeof (step as TrackStep).label === 'string',
  );
}

export function resolveTrackStepsDisplay(
  steps: TrackStep[],
  resolvedAt: Date,
): TrackStep[] {
  if (steps.length === 0) return steps;

  const resolvedLabel = formatDisplayDateTime(resolvedAt);

  return steps.map((step, index) => {
    const isResolvedStep =
      step.label === 'Resolved' || index === steps.length - 1;

    if (isResolvedStep) {
      return {
        ...step,
        sub: resolvedLabel,
        state: 'done',
        lineState: 'done',
        icon: 'check',
      };
    }

    return {
      ...step,
      state: 'done',
      lineState: 'done',
      icon: 'check',
    };
  });
}

function trackStepsForTicket(
  detail: Record<string, unknown> | null,
  ticket: Ticket,
): TrackStep[] {
  const stored = asTrackSteps(detail?.trackSteps);
  const steps =
    stored.length > 0
      ? stored
      : buildAiCreatedTrackSteps(ticket.department, ticket.assignedTo);

  if (ticket.status === TicketStatus.RESOLVED) {
    return resolveTrackStepsDisplay(steps, ticket.updatedAt);
  }

  return steps;
}

export function getTicketTrackSteps(ticket: Ticket): TrackStep[] {
  const detail = parseDetailPayload(ticket);
  return trackStepsForTicket(detail, ticket);
}

export function resolveTicketDisplayStatus(ticket: Ticket) {
  const detail = parseDetailPayload(ticket);

  if (ticket.status === TicketStatus.RESOLVED) {
    return {
      status: STATUS_API.RESOLVED,
      statusLabel: STATUS_LABELS.RESOLVED,
    };
  }

  if (ticket.status === TicketStatus.PENDING) {
    return {
      status: STATUS_API.PENDING,
      statusLabel: STATUS_LABELS.PENDING,
    };
  }

  const steps = trackStepsForTicket(detail, ticket);
  const activeStep = steps.find((step) => step.state === 'active');
  if (activeStep) {
    return {
      status: trackStepToApiStatus(activeStep.label, ticket.status),
      statusLabel: activeStep.label,
    };
  }

  const pendingResolved = steps.find(
    (step) => step.label === 'Resolved' && step.state === 'pending',
  );
  if (pendingResolved) {
    const lastDone = [...steps].reverse().find((step) => step.state === 'done');
    if (lastDone) {
      return {
        status: 'progress',
        statusLabel: lastDone.label,
      };
    }
  }

  if (ticket.status === TicketStatus.IN_PROGRESS) {
    return {
      status: STATUS_API.IN_PROGRESS,
      statusLabel: STATUS_LABELS.IN_PROGRESS,
    };
  }

  return {
    status: STATUS_API[ticket.status],
    statusLabel: STATUS_LABELS[ticket.status],
  };
}

function trackStepToApiStatus(stepLabel: string, dbStatus: TicketStatus) {
  if (stepLabel === 'Resolved') {
    return STATUS_API.RESOLVED;
  }

  if (dbStatus === TicketStatus.PENDING) {
    return STATUS_API.PENDING;
  }

  return STATUS_API.IN_PROGRESS;
}

export function serializeTicketReplies(replies: TicketReplyRecord[] = []) {
  return replies.map((reply) => ({
    id: reply.id,
    content: reply.content,
    authorName: reply.authorUser.name,
    isStudent: reply.authorUser.role === 'STUDENT',
    createdAt: reply.createdAt.toISOString(),
    timeLabel: formatDisplayDateTime(reply.createdAt),
  }));
}

export function serializeTicketDetail(
  ticket: Ticket,
  replies: TicketReplyRecord[] = [],
  viewer?: AuthContext,
) {
  const detail = parseDetailPayload(ticket);
  const title = ticket.title ?? ticket.concern;
  const aiTriaged = isAiCreatedTicket(detail);
  const isTaken = Boolean(ticket.assignedStaffUserId);
  const isOpen = ticket.status !== TicketStatus.RESOLVED;
  const canReply =
    isOpen &&
    (viewer?.role === 'STUDENT'
      ? true
      : isTaken &&
        viewer?.userId === ticket.assignedStaffUserId &&
        (!viewer ||
          viewer.role !== 'STAFF' ||
          viewer.department === ticket.department));

  return {
    ...serializeTicketSummary(ticket),
    shortTitle:
      typeof detail?.shortTitle === 'string' ? detail.shortTitle : ticket.concern,
    title,
    description: ticket.description,
    urgencyLabel: URGENCY_LABELS[ticket.urgency],
    submitted: formatDisplayDate(ticket.createdAt),
    submittedShort: `Submitted ${formatDisplayDateTime(ticket.createdAt)}`,
    lastUpdated: formatDisplayDateTime(ticket.updatedAt),
    confirmation: ticket.confirmation,
    assignedTo: ticket.assignedTo ?? 'Unassigned',
    assignedStaffUserId: ticket.assignedStaffUserId,
    isTaken,
    aiTriaged,
    staffNotes: ticket.staffNotes,
    deadline: ticket.deadline ? formatDisplayDate(ticket.deadline) : null,
    estResolution: ticket.estResolution
      ? formatDisplayDate(ticket.estResolution)
      : null,
    appointment:
      detail && typeof detail.appointment === 'object' ? detail.appointment : null,
    trackSteps: trackStepsForTicket(detail, ticket),
    aiUpdates: Array.isArray(detail?.aiUpdates) ? detail.aiUpdates : [],
    timeline: Array.isArray(detail?.timeline) ? detail.timeline : [],
    related: Array.isArray(detail?.related) ? detail.related : [],
    replies: serializeTicketReplies(replies),
    canResolve: isOpen,
    canReply,
    canTake:
      viewer?.role === 'STAFF' &&
      !isTaken &&
      ticket.status !== TicketStatus.RESOLVED &&
      viewer.department === ticket.department,
  };
}

export function mergeDetailPayload(
  ticket: Ticket,
  updater: (detail: Record<string, unknown>) => Record<string, unknown>,
) {
  const detail = parseDetailPayload(ticket) ?? {};
  return JSON.stringify(updater(detail));
}

function ticketListWhere(ctx: AuthContext) {
  if (ctx.role === 'STUDENT') {
    return {
      schoolId: ctx.schoolId,
      studentUserId: ctx.userId,
    };
  }

  return { schoolId: ctx.schoolId };
}

export async function listTickets(ctx: AuthContext) {
  const tickets = await prisma.ticket.findMany({
    where: ticketListWhere(ctx),
    orderBy: { updatedAt: 'desc' },
  });

  return tickets.map(serializeTicketSummary);
}

async function getTicketRecord(ctx: AuthContext, ticketNumber: string) {
  const normalized = ticketNumber.replace(/^#/, '');
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber: normalized },
    include: {
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

export async function getTicketByNumber(ctx: AuthContext, ticketNumber: string) {
  const ticket = await getTicketRecord(ctx, ticketNumber);
  return serializeTicketDetail(ticket, ticket.replies, ctx);
}

export async function countOpenTickets(ctx: AuthContext) {
  const baseWhere = ticketListWhere(ctx);

  return prisma.ticket.count({
    where: {
      ...baseWhere,
      status: {
        in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PENDING],
      },
    },
  });
}

async function nextTicketNumber() {
  const latest = await prisma.ticket.findFirst({
    orderBy: { ticketNumber: 'desc' },
    select: { ticketNumber: true },
  });

  const latestNumber = latest ? Number.parseInt(latest.ticketNumber, 10) : 12270000;
  return String(latestNumber + Math.floor(Math.random() * 900) + 101);
}

export type CreateTicketInput = {
  concern: string;
  title?: string;
  description?: string;
  department: string;
  urgency?: TicketUrgency;
  studentUserId?: string;
  assignedTo?: string;
  confirmation?: string;
};

export async function createTicket(ctx: AuthContext, input: CreateTicketInput) {
  const studentUserId = input.studentUserId ?? ctx.userId;
  assertCanCreateTicketFor(ctx, studentUserId);

  const student = await prisma.user.findFirst({
    where: {
      id: studentUserId,
      schoolId: ctx.schoolId,
      role: 'STUDENT',
    },
  });

  if (!student) {
    throw new AppError(400, 'Invalid student for this school');
  }

  const department = normalizeTicketDepartmentLabel(input.department);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: await nextTicketNumber(),
      concern: input.concern,
      title: input.title,
      description: input.description,
      status: TicketStatus.IN_PROGRESS,
      urgency: input.urgency ?? TicketUrgency.MEDIUM,
      department,
      schoolId: ctx.schoolId,
      studentUserId,
      assignedTo: input.assignedTo,
      confirmation: input.confirmation,
      detailPayload: JSON.stringify({
        shortTitle: input.concern,
        aiUpdates: [
          {
            time: new Date().toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            body: `Ticket created for "${input.concern}" and routed to ${department}.`,
          },
        ],
        timeline: [
          {
            title: 'Ticket created',
            desc: input.description ?? input.concern,
            time: new Date().toISOString(),
            dotColor: '#7C3AED',
            showLine: false,
          },
        ],
        trackSteps: buildAiCreatedTrackSteps(department),
      }),
    },
  });

  await logAction(ctx.userId, 'ticket.create', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    studentUserId,
  });

  await notifyDepartmentStaff(ctx.schoolId, department, {
    title: 'New ticket in your queue',
    body: `${student.name} submitted "${input.concern}" — review and take the ticket when ready.`,
    link: `/staff-dashboard?ticket=${ticket.ticketNumber}`,
  });

  await notifyUser(studentUserId, {
    title: 'Ticket created',
    body: `Your ticket #${ticket.ticketNumber} was created and routed to ${department}.`,
    link: `/tickets/${ticket.ticketNumber}`,
  });

  return serializeTicketDetail(ticket, [], ctx);
}

export async function addTicketReply(
  ctx: AuthContext,
  ticketNumber: string,
  content: string,
) {
  const existing = await getTicketRecord(ctx, ticketNumber);
  assertCanReplyToTicket(ctx, existing);

  const trimmed = content.trim();
  if (!trimmed) {
    throw new AppError(400, 'Reply cannot be empty');
  }

  const now = new Date();
  const timeLabel = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  await prisma.ticketReply.create({
    data: {
      ticketId: existing.id,
      authorUserId: ctx.userId,
      content: trimmed,
    },
  });

  const ticket = await prisma.ticket.update({
    where: { id: existing.id },
    data: {
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
          title: ctx.role === 'STUDENT' ? 'Student follow-up' : 'Staff follow-up',
          desc: trimmed,
          time: timeLabel,
          dotColor: '#2563EB',
          showLine: false,
        });
        return { ...detail, timeline };
      }),
    },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          authorUser: { select: { name: true, role: true } },
        },
      },
    },
  });

  await logAction(ctx.userId, 'ticket.reply', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
  });

  if (ctx.role === 'STUDENT') {
    if (ticket.assignedStaffUserId) {
      await notifyUser(ticket.assignedStaffUserId, {
        title: 'New student follow-up',
        body: `${ticket.concern} — a student replied on ticket #${ticket.ticketNumber}.`,
        link: `/staff-dashboard?ticket=${ticket.ticketNumber}`,
      });
    } else {
      await notifyDepartmentStaff(ctx.schoolId, ticket.department, {
        title: 'New student follow-up',
        body: `${ticket.concern} — a student replied on ticket #${ticket.ticketNumber}. Review and take the ticket when ready.`,
        link: `/staff-dashboard?ticket=${ticket.ticketNumber}`,
      });
    }
  } else {
    await notifyUser(ticket.studentUserId, {
      title: 'Staff replied to your ticket',
      body: `${ticket.department} responded on ticket #${ticket.ticketNumber}.`,
      link: `/tickets/${ticket.ticketNumber}`,
    });
  }

  return serializeTicketDetail(ticket, ticket.replies, ctx);
}

export async function resolveTicket(ctx: AuthContext, ticketNumber: string) {
  const existing = await getTicketRecord(ctx, ticketNumber);
  assertCanResolveTicket(ctx, existing);

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
      status: TicketStatus.RESOLVED,
      updatedAt: now,
      confirmation: 'This ticket has been marked as resolved.',
      detailPayload: mergeDetailPayload(existing, (detail) => {
        const timeline = Array.isArray(detail.timeline) ? [...detail.timeline] : [];
        if (timeline.length > 0) {
          timeline[timeline.length - 1] = {
            ...timeline[timeline.length - 1],
            showLine: true,
          };
        }
        timeline.push({
          title: 'Ticket resolved',
          desc: 'You marked this ticket as resolved.',
          time: timeLabel,
          dotColor: '#16A34A',
          showLine: false,
        });

        const baseSteps = asTrackSteps(detail.trackSteps);
        const trackSteps = resolveTrackStepsDisplay(
          baseSteps.length > 0
            ? baseSteps
            : buildAiCreatedTrackSteps(existing.department, existing.assignedTo),
          now,
        );

        return { ...detail, timeline, trackSteps };
      }),
    },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          authorUser: { select: { name: true, role: true } },
        },
      },
    },
  });

  await logAction(ctx.userId, 'ticket.resolve', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
  });

  if (ticket.assignedStaffUserId) {
    await notifyUser(ticket.assignedStaffUserId, {
      title: 'Ticket resolved by student',
      body: `Ticket #${ticket.ticketNumber} was marked resolved by the student.`,
      link: `/staff-dashboard?ticket=${ticket.ticketNumber}`,
    });
  } else {
    await notifyDepartmentStaff(ctx.schoolId, ticket.department, {
      title: 'Ticket resolved by student',
      body: `Ticket #${ticket.ticketNumber} was marked resolved by the student.`,
      link: `/staff-dashboard?ticket=${ticket.ticketNumber}`,
    });
  }

  return serializeTicketDetail(ticket, ticket.replies, ctx);
}

export async function deleteTicket(ctx: AuthContext, ticketNumber: string) {
  const existing = await getTicketRecord(ctx, ticketNumber);
  assertCanDeleteTicket(ctx, existing);

  await prisma.ticket.delete({
    where: { id: existing.id },
  });

  await logAction(ctx.userId, 'ticket.delete', {
    ticketId: existing.id,
    ticketNumber: existing.ticketNumber,
  });

  return { ticketNumber: existing.ticketNumber };
}

export async function updateTicketStatus(
  ctx: AuthContext,
  ticketNumber: string,
  status: TicketStatus,
) {
  assertCanUpdateTicket(ctx);

  const normalized = ticketNumber.replace(/^#/, '');
  const existing = await prisma.ticket.findUnique({
    where: { ticketNumber: normalized },
  });

  if (!existing) {
    throw new AppError(404, 'Ticket not found');
  }

  assertCanViewTicket(ctx, existing);

  const ticket = await prisma.ticket.update({
    where: { id: existing.id },
    data: { status },
  });

  await logAction(ctx.userId, 'ticket.status.update', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    status,
  });

  return serializeTicketDetail(ticket);
}
