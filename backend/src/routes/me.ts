import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, getSessionUserId } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import {
  deleteUserAccount,
  getUserById,
  toPublicUser,
  updateUserProfile,
} from '../services/authService.js';
import { logAction } from '../services/actionLogService.js';
import {
  getUserSettings,
  updateUserSettings,
} from '../services/settingsService.js';

export const meRouter = Router();

meRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(getSessionUserId(req));
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(1),
});

meRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    const body = updateProfileSchema.parse(req.body);
    const user = await updateUserProfile(userId, body.name);
    await logAction(userId, 'profile.update', { name: user.name });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

const updateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  profileTheme: z.enum(['blue', 'teal', 'amber', 'purple', 'green']).optional(),
});

meRouter.get('/me/settings', requireAuth, loadAuthContext, async (req, res, next) => {
  try {
    const settings = await getUserSettings(req.auth!);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

meRouter.patch('/me/settings', requireAuth, loadAuthContext, async (req, res, next) => {
  try {
    const body = updateSettingsSchema.parse(req.body);
    const settings = await updateUserSettings(req.auth!, body);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

meRouter.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    await logAction(userId, 'account.delete', {});
    await deleteUserAccount(userId);
    req.session = null;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
