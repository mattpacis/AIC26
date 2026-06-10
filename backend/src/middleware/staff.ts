import type { Request, Response, NextFunction } from 'express';
import { assertStaff } from '../lib/permissions.js';

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    assertStaff(req.auth);
    next();
  } catch (err) {
    next(err);
  }
}
