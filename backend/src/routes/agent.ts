import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  requireAgentAuth,
  assertStudentAgentUser,
  stripAgentIdentityFromBody,
} from '../middleware/agentAuth.js';
import { createEmbedToken } from '../services/embedTokenService.js';
import { createDirectLineToken } from '../services/directLineService.js';
import { getUserById, toPublicUser } from '../services/authService.js';
import { getSessionUserId } from '../middleware/auth.js';
import { env, getAgentMode } from '../lib/env.js';
import { buildAgentContext } from '../services/agentContextService.js';
import {
  executeAgentTool,
  listAgentTools,
  normalizeAgentToolName,
} from '../services/agentToolService.js';
import { buildDevBridgeReply } from '../services/agentProvider.js';

export const agentRouter = Router();

agentRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    agentMode: getAgentMode(),
    agentContractVersion: '1.0',
    mockCopilotUrl:
      env.NODE_ENV === 'development'
        ? `${env.oauthCallbackBaseUrl}/api/agent/mock-copilot`
        : null,
  });
});

const mockCopilotSchema = z.object({
  message: z.string().min(1),
  threadId: z.string().optional(),
  context: z.record(z.string(), z.unknown()),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
});

// Dev-only stand-in for Power Automate / Copilot Studio while Microsoft wiring is in progress.
agentRouter.post('/mock-copilot', (req, res, next) => {
  try {
    if (env.NODE_ENV !== 'development') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const body = mockCopilotSchema.parse(req.body);
    const reply = buildDevBridgeReply(
      body.message,
      body.context as Parameters<typeof buildDevBridgeReply>[1],
    );

    res.json({
      reply: `[Mock Copilot] ${reply}`,
      source: 'mock-copilot',
    });
  } catch (err) {
    next(err);
  }
});

agentRouter.get('/embed-token', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(getSessionUserId(req));
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = createEmbedToken(user.id, user.email);
    res.json({
      token,
      userId: user.id,
      email: user.email,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

agentRouter.get('/direct-line-token', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(getSessionUserId(req));
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const directLine = await createDirectLineToken();
    const campus360Token = createEmbedToken(user.id, user.email);

    res.json({
      token: directLine.token,
      conversationId: directLine.conversationId,
      expiresIn: directLine.expires_in,
      userId: user.id,
      email: user.email,
      campus360Token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

agentRouter.use(requireAgentAuth);

agentRouter.get('/tools', (_req, res) => {
  res.json(listAgentTools());
});

agentRouter.get('/context', async (req, res, next) => {
  try {
    assertStudentAgentUser(req);
    const threadId =
      typeof req.query.threadId === 'string' ? req.query.threadId : undefined;
    const context = await buildAgentContext(req.auth!, threadId);
    res.json({ context });
  } catch (err) {
    next(err);
  }
});

agentRouter.post('/invoke', async (req, res, next) => {
  try {
    const raw =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};

    const toolName =
      typeof raw.toolName === 'string' ? raw.toolName : undefined;
    if (!toolName?.trim()) {
      res.status(400).json({ error: 'toolName is required in JSON body' });
      return;
    }

    const body = stripAgentIdentityFromBody(raw);
    const result = await executeAgentTool(req.auth!, toolName, { body });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

agentRouter.post('/tools/:toolName', async (req, res, next) => {
  try {
    const body =
      req.body && typeof req.body === 'object'
        ? stripAgentIdentityFromBody(req.body as Record<string, unknown>)
        : {};

    const result = await executeAgentTool(
      req.auth!,
      normalizeAgentToolName(req.params.toolName),
      {
        body,
        query: req.query as Record<string, unknown>,
      },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
