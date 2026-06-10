import { Router } from 'express';
import { requireAuth, getSessionUserId } from '../middleware/auth.js';
import { getUserById, toPublicUser } from '../services/authService.js';
import { listThreads } from '../services/chatService.js';
import { countActiveHolds } from '../services/holdService.js';
import { countOpenTickets } from '../services/ticketService.js';
import { loadAuthContext } from '../middleware/context.js';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', requireAuth, loadAuthContext, async (req, res, next) => {
  try {
    const user = await getUserById(getSessionUserId(req));
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const threads = await listThreads(user.id);
    const [openTicketCount, activeHoldCount] = await Promise.all([
      countOpenTickets(req.auth!),
      countActiveHolds(req.auth!),
    ]);

    res.json({
      user: toPublicUser(user),
      summary: {
        openTicketCount,
        pendingActionCount: activeHoldCount,
        activeHoldCount,
        chatThreadCount: threads.length,
      },
    });
  } catch (err) {
    next(err);
  }
});
