import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/permissions.js';

type AttemptWindow = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptWindow>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

function clientKey(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.socket.remoteAddress;
  return ip ?? 'unknown';
}

export function loginRateLimit(req: Request, _res: Response, next: NextFunction) {
  const key = clientKey(req);
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_ATTEMPTS) {
    next(new AppError(429, 'Too many sign-in attempts. Please wait a few minutes.'));
    return;
  }

  current.count += 1;
  attempts.set(key, current);
  next();
}
