import type { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/authService.js';
import type { AuthContext } from '../lib/permissions.js';
import { getSessionUserId } from './auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export async function loadAuthContext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await getUserById(getSessionUserId(req));
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
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
    next(err);
  }
}
