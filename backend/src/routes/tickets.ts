import { Router } from 'express';
import { TicketStatus, TicketUrgency } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import {
  addTicketReply,
  cancelTicket,
  createTicket,
  deleteTicket,
  getTicketByNumber,
  listTickets,
  updateTicketStatus,
} from '../services/ticketService.js';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth, loadAuthContext);

ticketsRouter.get('/tickets', async (req, res, next) => {
  try {
    const tickets = await listTickets(req.auth!);
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

ticketsRouter.get('/tickets/:ticketNumber', async (req, res, next) => {
  try {
    const ticket = await getTicketByNumber(req.auth!, req.params.ticketNumber);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

const createTicketSchema = z.object({
  concern: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(240).optional(),
  description: z.string().trim().max(2000).optional(),
  department: z.string().trim().min(1).max(120),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  studentUserId: z.string().min(1).optional(),
  assignedTo: z.string().trim().max(120).optional(),
  confirmation: z.string().trim().max(500).optional(),
});

ticketsRouter.post('/tickets', async (req, res, next) => {
  try {
    const body = createTicketSchema.parse(req.body);
    const ticket = await createTicket(req.auth!, {
      ...body,
      urgency: body.urgency as TicketUrgency | undefined,
    });
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED']),
});

const replySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

ticketsRouter.post('/tickets/:ticketNumber/replies', async (req, res, next) => {
  try {
    const { content } = replySchema.parse(req.body);
    const ticket = await addTicketReply(
      req.auth!,
      req.params.ticketNumber,
      content,
    );
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

ticketsRouter.post('/tickets/:ticketNumber/cancel', async (req, res, next) => {
  try {
    const ticket = await cancelTicket(req.auth!, req.params.ticketNumber);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

ticketsRouter.delete('/tickets/:ticketNumber', async (req, res, next) => {
  try {
    const result = await deleteTicket(req.auth!, req.params.ticketNumber);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

ticketsRouter.patch('/tickets/:ticketNumber/status', async (req, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const ticket = await updateTicketStatus(
      req.auth!,
      req.params.ticketNumber,
      status as TicketStatus,
    );
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});
