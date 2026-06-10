import type { Request, Response, NextFunction } from 'express';
import { env } from '../lib/env.js';
import { AppError } from '../lib/permissions.js';
import { prisma } from '../lib/db.js';
import { getUserById } from '../services/authService.js';
import { verifyEmbedToken } from '../services/embedTokenService.js';

const USER_ID_HEADERS = [
  'x-campus360-user-id',
  'campus360-user-id',
] as const;

const USER_EMAIL_HEADERS = [
  'x-campus360-user-email',
  'campus360-user-email',
] as const;

const EMBED_TOKEN_HEADERS = [
  'x-campus360-embed-token',
  'campus360-embed-token',
] as const;

function readHeader(req: Request, names: readonly string[]) {
  for (const name of names) {
    const value = req.header(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function parseBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readIdentityFromBody(req: Request) {
  const body =
    req.body && typeof req.body === 'object'
      ? (req.body as Record<string, unknown>)
      : undefined;

  if (!body) {
    return {
      userId: undefined,
      userEmail: undefined,
      embedToken: undefined,
    };
  }

  return {
    userId: readString(body.userId) ?? readString(body.campus360UserId),
    userEmail:
      readString(body.userEmail) ??
      readString(body.campus360Email) ??
      readString(body['Campus360-User-Email']),
    embedToken:
      readString(body.embedToken) ?? readString(body.campus360Token),
  };
}

export function stripAgentIdentityFromBody(body: Record<string, unknown>) {
  const {
    userId: _userId,
    campus360UserId: _campus360UserId,
    userEmail: _userEmail,
    campus360Email: _campus360Email,
    embedToken: _embedToken,
    campus360Token: _campus360Token,
    toolName: _toolName,
    ...rest
  } = body;

  return rest;
}

export async function requireAgentAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = parseBearerToken(req.headers.authorization);
    const expectedKey = env.agentApiKey;

    if (!expectedKey || !token || token !== expectedKey) {
      res.status(401).json({ error: 'Invalid agent API key' });
      return;
    }

    const bodyIdentity = readIdentityFromBody(req);
    let userId = readHeader(req, USER_ID_HEADERS) ?? bodyIdentity.userId;
    let userEmail =
      readHeader(req, USER_EMAIL_HEADERS)?.toLowerCase() ??
      bodyIdentity.userEmail?.toLowerCase();
    const embedToken =
      readHeader(req, EMBED_TOKEN_HEADERS) ?? bodyIdentity.embedToken;

    if (embedToken) {
      const payload = verifyEmbedToken(embedToken);
      userId = userId ?? payload.userId;
      userEmail = userEmail ?? payload.email;
    }

    let user = userId ? await getUserById(userId) : null;

    if (!user && userEmail) {
      user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { school: true, student: true },
      });
    }

    if (!userId && !userEmail && !embedToken) {
      res.status(400).json({
        error:
          'Missing identity. Send Campus360-User-Email (or X-Campus360-User-Email), userEmail in JSON body, or embedToken.',
      });
      return;
    }

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    req.auth = {
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId,
      department: user.department,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export function assertStudentAgentUser(req: Request) {
  if (!req.auth) {
    throw new AppError(401, 'Authentication required');
  }
  if (req.auth.role !== 'STUDENT') {
    throw new AppError(
      403,
      'Campus360 student agent is only available for student accounts',
    );
  }
}
