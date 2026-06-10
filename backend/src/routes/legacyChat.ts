import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, getSessionUserId } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import { getUserById } from '../services/authService.js';
import { sendChatMessage } from '../services/chatService.js';

export const legacyChatRouter = Router();

legacyChatRouter.use(requireAuth, loadAuthContext);

// Legacy endpoint kept for Home.tsx and the original shared contract.
legacyChatRouter.post('/chat', async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const body = z
      .object({
        message: z.string().trim().min(1).max(4000),
        sessionId: z.string().min(1).optional(),
      })
      .parse(req.body);

    const result = await sendChatMessage(
      req.auth!,
      body.message,
      body.sessionId,
    );

    res.json({
      reply: result.reply,
      sessionId: result.threadId,
    });
  } catch (err) {
    next(err);
  }
});
