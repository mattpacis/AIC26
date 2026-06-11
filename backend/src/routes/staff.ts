import { Router } from 'express';
import { TicketStatus, TicketUrgency } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import { requireStaff } from '../middleware/staff.js';
import { getStaffAnalytics } from '../services/staffAnalyticsService.js';
import { getStaffDashboard } from '../services/staffDashboardService.js';
import { listStudents, getStudentProfile } from '../services/studentService.js';
import { listStaffDirectory } from '../services/staffDirectoryService.js';
import {
  createStaffTicket,
  getStaffTicketByNumber,
  listStaffQueueTickets,
  rescheduleStaffTicket,
  takeStaffTicket,
  updateStaffTicket,
} from '../services/staffTicketService.js';
import { addTicketReply } from '../services/ticketService.js';
import { listAppointments } from '../services/appointmentService.js';

export const staffRouter = Router();

staffRouter.use(requireAuth, loadAuthContext, requireStaff);

staffRouter.get('/dashboard', async (req, res, next) => {
  try {
    const dashboard = await getStaffDashboard(req.auth!);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/analytics', async (req, res, next) => {
  try {
    const analytics = await getStaffAnalytics(req.auth!);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/tickets', async (req, res, next) => {
  try {
    const tickets = await listStaffQueueTickets(req.auth!, {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      urgency: typeof req.query.urgency === 'string' ? req.query.urgency : undefined,
      department:
        typeof req.query.department === 'string' ? req.query.department : undefined,
      includeResolved: req.query.includeResolved === 'true',
      mineOnly: req.query.mineOnly === 'true',
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      sort:
        typeof req.query.sort === 'string' &&
        ['newest', 'oldest', 'urgency', 'student'].includes(req.query.sort)
          ? (req.query.sort as 'newest' | 'oldest' | 'urgency' | 'student')
          : undefined,
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

const createStaffTicketSchema = z.object({
  studentUserId: z.string().min(1),
  concern: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

staffRouter.post('/tickets', async (req, res, next) => {
  try {
    const body = createStaffTicketSchema.parse(req.body);
    const ticket = await createStaffTicket(req.auth!, {
      studentUserId: body.studentUserId,
      concern: body.concern,
      description: body.description,
      urgency: body.urgency as TicketUrgency | undefined,
    });
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/tickets/:ticketNumber', async (req, res, next) => {
  try {
    const ticket = await getStaffTicketByNumber(req.auth!, req.params.ticketNumber);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

const updateStaffTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED']).optional(),
  assignedTo: z.string().trim().max(120).optional(),
  staffNotes: z.string().trim().max(4000).optional(),
});

staffRouter.post('/tickets/:ticketNumber/take', async (req, res, next) => {
  try {
    const ticket = await takeStaffTicket(req.auth!, req.params.ticketNumber);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

const rescheduleTicketSchema = z.object({
  scheduledAt: z.string().min(1),
});

staffRouter.post('/tickets/:ticketNumber/reschedule', async (req, res, next) => {
  try {
    const { scheduledAt } = rescheduleTicketSchema.parse(req.body);
    const ticket = await rescheduleStaffTicket(
      req.auth!,
      req.params.ticketNumber,
      scheduledAt,
    );
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

staffRouter.patch('/tickets/:ticketNumber', async (req, res, next) => {
  try {
    const body = updateStaffTicketSchema.parse(req.body);
    const ticket = await updateStaffTicket(req.auth!, req.params.ticketNumber, {
      ...body,
      status: body.status as TicketStatus | undefined,
    });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

const replySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

staffRouter.post('/tickets/:ticketNumber/replies', async (req, res, next) => {
  try {
    const { content } = replySchema.parse(req.body);
    const ticket = await addTicketReply(req.auth!, req.params.ticketNumber, content);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/students', async (req, res, next) => {
  try {
    const students = await listStudents(req.auth!, {
      holds: req.query.holds === 'true',
      openTickets: req.query.openTickets === 'true',
      yearLevel:
        typeof req.query.yearLevel === 'string' ? req.query.yearLevel : undefined,
      program: typeof req.query.program === 'string' ? req.query.program : undefined,
    });
    res.json({ students });
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/students/:studentKey', async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.auth!, req.params.studentKey);
    res.json({ student });
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/appointments', async (req, res, next) => {
  try {
    const status =
      typeof req.query.status === 'string' &&
      ['all', 'upcoming', 'completed'].includes(req.query.status)
        ? (req.query.status as 'all' | 'upcoming' | 'completed')
        : 'upcoming';
    const appointments = await listAppointments(req.auth!, {
      status,
      year:
        typeof req.query.year === 'string'
          ? Number.parseInt(req.query.year, 10)
          : undefined,
      month:
        typeof req.query.month === 'string'
          ? Number.parseInt(req.query.month, 10)
          : undefined,
      day:
        typeof req.query.day === 'string'
          ? Number.parseInt(req.query.day, 10)
          : undefined,
    });
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

staffRouter.get('/directory', async (req, res, next) => {
  try {
    const members = await listStaffDirectory(req.auth!);
    res.json({ members });
  } catch (err) {
    next(err);
  }
});
