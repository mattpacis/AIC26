import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import {
  getDepartmentAvailability,
  listAppointmentDepartments,
} from '../services/appointmentAvailabilityService.js';
import {
  cancelAppointment,
  createAppointment,
  deleteAppointment,
  getAppointmentById,
  getAppointmentSummary,
  listAppointments,
  rescheduleAppointment,
} from '../services/appointmentService.js';

export const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth, loadAuthContext);

appointmentsRouter.get('/appointments/departments', async (_req, res) => {
  res.json({ departments: listAppointmentDepartments() });
});

appointmentsRouter.get('/appointments/availability', async (req, res, next) => {
  try {
    const department = z.string().trim().min(1).parse(req.query.department);
    const year = z.coerce.number().parse(req.query.year);
    const month = z.coerce.number().min(0).max(11).parse(req.query.month);
    const day = req.query.day
      ? z.coerce.number().min(1).max(31).parse(req.query.day)
      : undefined;
    const excludeAppointmentId = req.query.excludeAppointmentId
      ? z.string().min(1).parse(req.query.excludeAppointmentId)
      : undefined;

    const availability = await getDepartmentAvailability(req.auth!, {
      department,
      year,
      month,
      day,
      excludeAppointmentId,
    });

    res.json({ availability });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.get('/appointments/summary', async (req, res, next) => {
  try {
    const summary = await getAppointmentSummary(req.auth!);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.get('/appointments', async (req, res, next) => {
  try {
    const status = z
      .enum(['all', 'upcoming', 'completed'])
      .optional()
      .parse(req.query.status);
    const year = req.query.year
      ? z.coerce.number().parse(req.query.year)
      : undefined;
    const month = req.query.month
      ? z.coerce.number().min(0).max(11).parse(req.query.month)
      : undefined;
    const day = req.query.day
      ? z.coerce.number().min(1).max(31).parse(req.query.day)
      : undefined;

    const appointments = await listAppointments(req.auth!, {
      status,
      year,
      month,
      day,
    });

    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.get('/appointments/:appointmentId', async (req, res, next) => {
  try {
    const appointment = await getAppointmentById(
      req.auth!,
      req.params.appointmentId,
    );
    res.json({ appointment });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  department: z.string().trim().min(1).max(120),
  purpose: z.string().trim().max(500).optional(),
  location: z.string().trim().max(200).optional(),
  staffName: z.string().trim().max(120).optional(),
  scheduledAt: z.string().min(1),
  deadline: z.string().optional(),
  ticketNumber: z.string().trim().max(32).optional(),
  bringItems: z.array(z.string().trim().min(1)).optional(),
  studentUserId: z.string().min(1).optional(),
});

appointmentsRouter.post('/appointments', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const appointment = await createAppointment(req.auth!, body);
    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
});

const rescheduleSchema = z.object({
  scheduledAt: z.string().min(1),
});

appointmentsRouter.patch(
  '/appointments/:appointmentId/reschedule',
  async (req, res, next) => {
    try {
      const { scheduledAt } = rescheduleSchema.parse(req.body);
      const appointment = await rescheduleAppointment(
        req.auth!,
        req.params.appointmentId,
        scheduledAt,
      );
      res.json({ appointment });
    } catch (err) {
      next(err);
    }
  },
);

appointmentsRouter.patch(
  '/appointments/:appointmentId/cancel',
  async (req, res, next) => {
    try {
      const appointment = await cancelAppointment(
        req.auth!,
        req.params.appointmentId,
      );
      res.json({ appointment });
    } catch (err) {
      next(err);
    }
  },
);

appointmentsRouter.delete(
  '/appointments/:appointmentId',
  async (req, res, next) => {
    try {
      const result = await deleteAppointment(req.auth!, req.params.appointmentId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
