import { Router } from 'express';
import { z } from 'zod';
import {
  login,
  registerLocalAccount,
  requestPasswordReset,
  resetPasswordWithToken,
} from '../services/authService.js';
import { loginRateLimit } from '../middleware/loginRateLimit.js';
import { logAction } from '../services/actionLogService.js';
import {
  buildOAuthStartUrl,
  completeOAuthCallback,
  listOAuthProviders,
  oauthErrorRedirect,
  oauthSuccessRedirect,
} from '../services/oauthService.js';
import { getOAuthQueryParam } from '../lib/oauth.js';
import { listStaffSignupDepartmentsForApi } from '../lib/departments.js';
import { AppError } from '../lib/permissions.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
    role: z.enum(['student', 'staff']),
    department: z.string().trim().min(1).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.role === 'staff' && !body.department) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Department is required for staff accounts',
        path: ['department'],
      });
    }
  });

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const user = await registerLocalAccount(body);

    req.session!.userId = user.id;
    await logAction(user.id, 'auth.register', { email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
        department: user.department,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', loginRateLimit, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await login(email, password);

    req.session!.userId = user.id;

    await logAction(user.id, 'auth.login', { email: user.email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/providers', (_req, res) => {
  res.json({ providers: listOAuthProviders() });
});

authRouter.get('/staff-departments', (_req, res) => {
  res.json({ departments: listStaffSignupDepartmentsForApi() });
});

function parseOAuthRole(raw: string | undefined) {
  return raw === 'staff' ? 'staff' : 'student';
}

authRouter.get('/google', (req, res, next) => {
  try {
    const role = parseOAuthRole(getOAuthQueryParam(req, 'role'));
    const url = buildOAuthStartUrl('google', role);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const error = getOAuthQueryParam(req, 'error');
    if (error) {
      res.redirect(oauthErrorRedirect('Google sign-in was cancelled'));
      return;
    }

    const code = getOAuthQueryParam(req, 'code');
    const state = getOAuthQueryParam(req, 'state');
    if (!code || !state) {
      throw new AppError(400, 'Missing OAuth callback parameters');
    }

    const result = await completeOAuthCallback('google', code, state);
    req.session!.userId = result.user.id;
    res.redirect(oauthSuccessRedirect(result.role));
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Google sign-in failed';
    res.redirect(oauthErrorRedirect(message));
  }
});

authRouter.get('/microsoft', (req, res, next) => {
  try {
    const role = parseOAuthRole(getOAuthQueryParam(req, 'role'));
    const url = buildOAuthStartUrl('microsoft', role);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/microsoft/callback', async (req, res, next) => {
  try {
    const error = getOAuthQueryParam(req, 'error');
    if (error) {
      res.redirect(oauthErrorRedirect('Microsoft sign-in was cancelled'));
      return;
    }

    const code = getOAuthQueryParam(req, 'code');
    const state = getOAuthQueryParam(req, 'state');
    if (!code || !state) {
      throw new AppError(400, 'Missing OAuth callback parameters');
    }

    const result = await completeOAuthCallback('microsoft', code, state);
    req.session!.userId = result.user.id;
    res.redirect(oauthSuccessRedirect(result.role));
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Microsoft sign-in failed';
    res.redirect(oauthErrorRedirect(message));
  }
});

authRouter.post('/logout', async (req, res) => {
  const userId = req.session?.userId;
  req.session = null;

  if (userId) {
    await logAction(userId, 'auth.logout', {});
  }

  res.json({ ok: true });
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8),
});

authRouter.post('/forgot-password', loginRateLimit, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', loginRateLimit, async (req, res, next) => {
  try {
    const { email, token, password } = resetPasswordSchema.parse(req.body);
    await resetPasswordWithToken(email, token, password);
    res.json({ ok: true, message: 'Password updated. You can sign in now.' });
  } catch (err) {
    next(err);
  }
});
