import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import {
  clearAllNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth, loadAuthContext);

notificationsRouter.get('/notifications', async (req, res, next) => {
  try {
    const data = await listNotifications(req.auth!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/notifications/:id/read', async (req, res, next) => {
  try {
    const notification = await markNotificationRead(req.auth!, req.params.id);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/notifications/read-all', async (req, res, next) => {
  try {
    const data = await markAllNotificationsRead(req.auth!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/notifications/clear-all', async (req, res, next) => {
  try {
    const data = await clearAllNotifications(req.auth!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
