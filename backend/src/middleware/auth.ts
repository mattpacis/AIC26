import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function getSessionUserId(req: Request): string {
  const userId = req.session?.userId;
  if (!userId) {
    throw new Error('Session user id missing');
  }
  return userId;
}
