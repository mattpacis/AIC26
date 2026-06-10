import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/permissions.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues.map((issue) => issue.message).join('; '),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof Error && err.message === 'Invalid credentials') {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (err instanceof Error && err.message === 'Ticket not found') {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
