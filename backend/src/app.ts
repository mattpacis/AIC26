import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import { env } from './lib/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { chatRouter } from './routes/chat.js';
import { legacyChatRouter } from './routes/legacyChat.js';
import { dashboardRouter } from './routes/dashboard.js';
import { ticketsRouter } from './routes/tickets.js';
import { appointmentsRouter } from './routes/appointments.js';
import { holdsRouter } from './routes/holds.js';
import { staffRouter } from './routes/staff.js';
import { agentRouter } from './routes/agent.js';
import { notificationsRouter } from './routes/notifications.js';

export function createApp() {
  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json());

  const crossOriginFrontend =
    env.NODE_ENV === 'production' &&
    !env.CORS_ORIGIN.includes('localhost');

  app.use(
    cookieSession({
      name: 'campus360_session',
      secret: env.SESSION_SECRET,
      httpOnly: true,
      sameSite: crossOriginFrontend ? 'none' : 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }),
  );

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/agent', agentRouter);
  app.use('/api', meRouter);
  app.use('/api', notificationsRouter);
  app.use('/api', dashboardRouter);
  app.use('/api', ticketsRouter);
  app.use('/api', appointmentsRouter);
  app.use('/api', holdsRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api', legacyChatRouter);

  app.use(errorHandler);

  return app;
}
