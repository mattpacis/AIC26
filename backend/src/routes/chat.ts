import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, getSessionUserId } from '../middleware/auth.js';
import { loadAuthContext } from '../middleware/context.js';
import { getUserById } from '../services/authService.js';
import {
  createThread,
  getThreadMessages,
  listThreads,
  sendChatMessage,
  serializeMessage,
} from '../services/chatService.js';

export const chatRouter = Router();

chatRouter.use(requireAuth, loadAuthContext);

const createThreadSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  threadId: z.string().min(1).optional(),
});

chatRouter.get('/threads', async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    const threads = await listThreads(userId);

    res.json({
      threads: threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt.toISOString(),
        lastMessage: thread.messages[0]
          ? serializeMessage(thread.messages[0])
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

chatRouter.post('/threads', async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { title } = createThreadSchema.parse(req.body);
    const { thread, greeting } = await createThread(userId, user.schoolId, title);

    res.status(201).json({
      thread: {
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt.toISOString(),
      },
      messages: [serializeMessage(greeting)],
    });
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/threads/:threadId/messages', async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    const messages = await getThreadMessages(req.params.threadId, userId);

    if (!messages) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    res.json({ messages: messages.map(serializeMessage) });
  } catch (err) {
    next(err);
  }
});

chatRouter.post('/messages', async (req, res, next) => {
  try {
    const userId = getSessionUserId(req);
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { message, threadId } = sendMessageSchema.parse(req.body);
    const result = await sendChatMessage(req.auth!, message, threadId);

    res.json({
      threadId: result.threadId,
      reply: result.reply,
      agentMode: result.agentMode,
      sessionId: result.threadId,
      messages: [
        serializeMessage(result.userMessage),
        serializeMessage(result.assistantMessage),
      ],
    });
  } catch (err) {
    next(err);
  }
});

