import { TicketStatus, TicketUrgency } from '@prisma/client';
import { type AuthContext, AppError } from '../lib/permissions.js';
import { logAction } from './actionLogService.js';
import { buildAgentContext } from './agentContextService.js';
import { getUserById, toPublicUser } from './authService.js';
import {
  listAppointmentDepartments,
  getDepartmentAvailability,
  resolveBookableSlot,
} from './appointmentAvailabilityService.js';
import {
  cancelAppointment,
  createAppointment,
  getAppointmentSummary,
  listAppointments,
  rescheduleAppointment,
} from './appointmentService.js';
import { getHoldSummary, listHolds } from './holdService.js';
import {
  createNotification,
  listNotifications,
} from './notificationService.js';
import { DEMO_TODAY } from '../lib/demoDate.js';
import {
  addTicketReply,
  cancelTicket,
  createTicket,
  getTicketByNumber,
  listTickets,
} from './ticketService.js';

const READ_TOOLS = new Set([
  'get_context',
  'get_me',
  'list_tickets',
  'get_ticket',
  'list_appointments',
  'get_appointment_summary',
  'get_availability',
  'list_holds',
  'list_departments',
  'list_notifications',
]);

const WRITE_TOOLS = new Set([
  'create_ticket',
  'add_ticket_reply',
  'cancel_ticket',
  'request_appointment',
  'reschedule_appointment',
  'cancel_appointment',
  'create_notification',
]);

const ALLOWED_TOOLS = new Set([...READ_TOOLS, ...WRITE_TOOLS]);

export type AgentToolInput = {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

function assertStudentAgent(ctx: AuthContext) {
  if (ctx.role !== 'STUDENT') {
    throw new AppError(
      403,
      'Campus360 student agent tools are only available for student accounts',
    );
  }
}

function asString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, `${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : undefined;
}

function readDepartment(body: Record<string, unknown>, query?: Record<string, unknown>) {
  return (
    optionalString(body.department) ??
    optionalString(body.department_availability) ??
    optionalString(body.departmentName) ??
    optionalString(query?.department) ??
    optionalString(query?.department_availability)
  );
}

function queryString(query: Record<string, unknown> | undefined, key: string) {
  const value = query?.[key];
  return typeof value === 'string' ? value : undefined;
}

function queryNumber(query: Record<string, unknown> | undefined, key: string) {
  const raw = query?.[key];
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const num = Number(raw.trim());
    if (!Number.isNaN(num)) return num;
  }
  throw new AppError(400, `${key} must be a number`);
}

export function normalizeAgentToolName(toolName: string) {
  return toolName
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** Agent/Copilot: prefer calendarMonth 1-12 (June=6). monthIndex 0-11 is optional for API-style callers. */
function resolveAgentAvailabilityMonth(
  body: Record<string, unknown>,
  query?: Record<string, unknown>,
) {
  const monthIndex =
    queryNumber(query, 'monthIndex') ?? queryNumber(body, 'monthIndex');
  if (monthIndex !== undefined) {
    if (monthIndex < 0 || monthIndex > 11) {
      throw new AppError(400, 'monthIndex must be 0-11 (June = 5)');
    }
    return monthIndex;
  }

  const calendarMonth =
    queryNumber(query, 'calendarMonth') ??
    queryNumber(body, 'calendarMonth') ??
    queryNumber(query, 'month') ??
    queryNumber(body, 'month');

  if (calendarMonth === undefined) {
    return DEMO_TODAY.month;
  }

  if (calendarMonth >= 1 && calendarMonth <= 12) {
    return calendarMonth - 1;
  }

  throw new AppError(
    400,
    'Use calendarMonth 1-12 for human months (June = 6, July = 7), or monthIndex 0-11 (June = 5).',
  );
}

function normalizeTicketUrgency(raw: unknown): TicketUrgency | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;

  const normalized = raw.trim().toUpperCase();
  const map: Record<string, TicketUrgency> = {
    LOW: TicketUrgency.LOW,
    MEDIUM: TicketUrgency.MEDIUM,
    MED: TicketUrgency.MEDIUM,
    HIGH: TicketUrgency.HIGH,
    CRITICAL: TicketUrgency.HIGH,
    URGENT: TicketUrgency.HIGH,
    EMERGENCY: TicketUrgency.HIGH,
  };

  return map[normalized];
}

function parseCreateTicketInput(body: Record<string, unknown>) {
  const concern =
    optionalString(body.concern) ??
    optionalString(body.title) ??
    optionalString(body.message) ??
    optionalString(body.issue) ??
    optionalString(body.summary);

  if (!concern) {
    throw new AppError(400, 'concern is required');
  }

  let department = readDepartment(body);
  if (!department) {
    const hint = `${concern} ${optionalString(body.description) ?? ''}`.toLowerCase();
    if (
      hint.includes('wifi') ||
      hint.includes('wi-fi') ||
      hint.includes('internet') ||
      hint.includes('network')
    ) {
      department = 'IT Department';
    } else {
      throw new AppError(400, 'department is required');
    }
  }

  const urgency = normalizeTicketUrgency(body.urgency);
  if (body.urgency !== undefined && body.urgency !== null && body.urgency !== '' && !urgency) {
    throw new AppError(
      400,
      'urgency must be LOW, MEDIUM, or HIGH (CRITICAL is mapped to HIGH)',
    );
  }

  return {
    concern,
    title: optionalString(body.title),
    description: optionalString(body.description),
    department,
    urgency,
  };
}

export async function executeAgentTool(
  ctx: AuthContext,
  toolName: string,
  input: AgentToolInput = {},
) {
  const normalizedToolName = normalizeAgentToolName(toolName);

  if (!ALLOWED_TOOLS.has(normalizedToolName)) {
    throw new AppError(
      404,
      `Unknown agent tool: ${toolName}. Use underscore names like create_ticket, list_holds.`,
    );
  }

  assertStudentAgent(ctx);

  const body = input.body ?? {};
  const query = input.query ?? {};

  let result: unknown;

  switch (normalizedToolName) {
    case 'get_context':
      result = {
        context: await buildAgentContext(
          ctx,
          optionalString(body.threadId) ?? queryString(query, 'threadId'),
        ),
      };
      break;
    case 'get_me': {
      const user = await getUserById(ctx.userId);
      if (!user) throw new AppError(404, 'User not found');
      result = { user: toPublicUser(user) };
      break;
    }
    case 'list_tickets':
      result = { tickets: await listTickets(ctx) };
      break;
    case 'get_ticket':
      result = {
        ticket: await getTicketByNumber(
          ctx,
          asString(body.ticketNumber ?? query.ticketNumber, 'ticketNumber'),
        ),
      };
      break;
    case 'create_ticket':
      result = {
        ticket: await createTicket(ctx, parseCreateTicketInput(body)),
      };
      break;
    case 'add_ticket_reply':
      result = {
        ticket: await addTicketReply(
          ctx,
          asString(body.ticketNumber ?? query.ticketNumber, 'ticketNumber'),
          asString(body.content, 'content'),
        ),
      };
      break;
    case 'cancel_ticket':
      result = {
        ticket: await cancelTicket(
          ctx,
          asString(body.ticketNumber ?? query.ticketNumber, 'ticketNumber'),
        ),
      };
      break;
    case 'list_appointments':
      result = {
        appointments: await listAppointments(ctx, {
          status:
            (optionalString(query.status ?? body.status) as
              | 'all'
              | 'upcoming'
              | 'completed'
              | undefined) ?? 'upcoming',
          year: queryNumber(query, 'year') ?? queryNumber(body, 'year'),
          month: queryNumber(query, 'month') ?? queryNumber(body, 'month'),
          day: queryNumber(query, 'day') ?? queryNumber(body, 'day'),
        }),
      };
      break;
    case 'get_appointment_summary':
      result = { summary: await getAppointmentSummary(ctx) };
      break;
    case 'get_availability': {
      const department = readDepartment(body, query);
      if (!department) {
        throw new AppError(
          400,
          'department is required (e.g. "Campus Health", "IT Department")',
        );
      }
      const monthIndex = resolveAgentAvailabilityMonth(body, query);
      result = {
        availability: await getDepartmentAvailability(ctx, {
          department,
          year:
            queryNumber(query, 'year') ??
            queryNumber(body, 'year') ??
            DEMO_TODAY.year,
          month: monthIndex,
          day: queryNumber(query, 'day') ?? queryNumber(body, 'day'),
          excludeAppointmentId:
            optionalString(body.excludeAppointmentId) ??
            queryString(query, 'excludeAppointmentId'),
        }),
      };
      break;
    }
    case 'list_holds':
      result = { holds: await listHolds(ctx), summary: await getHoldSummary(ctx) };
      break;
    case 'list_notifications':
      result = await listNotifications(ctx);
      break;
    case 'create_notification':
      result = {
        notification: await createNotification(ctx.userId, {
          title: asString(body.title, 'title'),
          body: asString(body.body, 'body'),
          link: optionalString(body.link),
        }),
      };
      break;
    case 'list_departments':
      result = { departments: listAppointmentDepartments() };
      break;
    case 'request_appointment': {
      const department = readDepartment(body, query);
      if (!department) {
        throw new AppError(
          400,
          'department is required (e.g. "Campus Health", "IT Department")',
        );
      }

      const slot = await resolveBookableSlot(
        ctx,
        department,
        {
          scheduledAt: optionalString(body.scheduledAt),
          year: queryNumber(query, 'year') ?? queryNumber(body, 'year'),
          month: queryNumber(query, 'month') ?? queryNumber(body, 'month'),
          day: queryNumber(query, 'day') ?? queryNumber(body, 'day'),
          time:
            optionalString(body.time) ??
            optionalString(body.timeLabel) ??
            optionalString(body.preferredTime),
          date:
            optionalString(body.date) ??
            optionalString(body.preferredDate) ??
            optionalString(body.appointmentDate),
        },
      );

      result = {
        appointment: await createAppointment(ctx, {
          title: asString(body.title, 'title'),
          department: slot.department,
          purpose: optionalString(body.purpose),
          location: optionalString(body.location),
          staffName: optionalString(body.staffName),
          scheduledAt: slot.scheduledAt.toISOString(),
          deadline: optionalString(body.deadline),
          ticketNumber: optionalString(body.ticketNumber),
          bringItems: Array.isArray(body.bringItems)
            ? body.bringItems.filter((item) => typeof item === 'string')
            : undefined,
        }),
      };
      break;
    }
    case 'reschedule_appointment':
      result = {
        appointment: await rescheduleAppointment(
          ctx,
          asString(body.appointmentId ?? query.appointmentId, 'appointmentId'),
          asString(body.scheduledAt, 'scheduledAt'),
        ),
      };
      break;
    case 'cancel_appointment':
      result = {
        appointment: await cancelAppointment(
          ctx,
          asString(body.appointmentId ?? query.appointmentId, 'appointmentId'),
        ),
      };
      break;
    default:
      throw new AppError(404, `Unknown agent tool: ${toolName}`);
  }

  await logAction(ctx.userId, `agent.tool.${normalizedToolName}`, {
    toolName: normalizedToolName,
    write: WRITE_TOOLS.has(normalizedToolName),
  });

  return {
    tool: normalizedToolName,
    ok: true,
    ...(result as Record<string, unknown>),
  };
}

export function listAgentTools() {
  return {
    readTools: [...READ_TOOLS],
    writeTools: [...WRITE_TOOLS],
  };
}
