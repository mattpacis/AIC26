import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, getSessionUserId } from '../middleware/auth.js';
import {
  deleteUserAccount,
  getUserById,
  toPublicUser,
  updateUserProfile,
} from '../services/authService.js';
import { logAction } from '../services/actionLogService.js';

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
