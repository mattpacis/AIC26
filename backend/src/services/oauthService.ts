import { AuthProvider, Role } from '@prisma/client';
import { env } from '../lib/env.js';
import {
  decodeOAuthState,
  encodeOAuthState,
  exchangeOAuthCode,
  fetchOAuthProfile,
  isEmailDomainAllowed,
  oauthRedirectUri,
  type OAuthProviderId,
  type OAuthState,
} from '../lib/oauth.js';
import { AppError } from '../lib/permissions.js';
import { prisma } from '../lib/db.js';
import { logAction } from './actionLogService.js';

function providerConfigured(provider: OAuthProviderId) {
  if (provider === 'google') {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }
  return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
}

export function listOAuthProviders() {
  return {
    google: {
      enabled: providerConfigured('google'),
      label: 'Google',
      startUrl: '/api/auth/google',
    },
    microsoft: {
      enabled: providerConfigured('microsoft'),
      label: 'Microsoft',
      startUrl: '/api/auth/microsoft',
    },
  };
}

export function buildOAuthStartUrl(provider: OAuthProviderId, role: OAuthState['role']) {
  if (!providerConfigured(provider)) {
    throw new AppError(503, `${provider} sign-in is not configured yet`);
  }

  const state = encodeOAuthState({
    provider,
    role,
    nonce: cryptoRandom(),
  });

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: oauthRedirectUri('google'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    if (env.GOOGLE_OAUTH_HD) {
      params.set('hd', env.GOOGLE_OAUTH_HD);
    }
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  const tenant = env.microsoftOAuthTenant;
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID!,
    redirect_uri: oauthRedirectUri('microsoft'),
    response_type: 'code',
    scope: 'openid profile email User.Read',
    state,
    prompt: 'select_account',
  });

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
}

function cryptoRandom() {
  return globalThis.crypto.randomUUID();
}

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function profileEmail(provider: OAuthProviderId, profile: Record<string, unknown>) {
  if (provider === 'google') {
    return typeof profile.email === 'string' ? normalizeEmail(profile.email) : null;
  }

  const msEmail =
    profile.email ??
    profile.preferred_username ??
    profile.upn ??
    profile.mail;
  return typeof msEmail === 'string' ? normalizeEmail(msEmail) : null;
}

function profileName(provider: OAuthProviderId, profile: Record<string, unknown>) {
  if (typeof profile.name === 'string' && profile.name.trim()) {
    return profile.name.trim();
  }

  if (typeof profile.displayName === 'string' && profile.displayName.trim()) {
    return profile.displayName.trim();
  }

  if (provider === 'microsoft') {
    const given = typeof profile.given_name === 'string' ? profile.given_name : '';
    const family = typeof profile.family_name === 'string' ? profile.family_name : '';
    const combined = `${given} ${family}`.trim();
    if (combined) return combined;
  }

  return 'Campus360 User';
}

async function resolveUser(
  provider: OAuthProviderId,
  role: OAuthState['role'],
  email: string,
  name: string,
) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { school: true, student: true },
  });

  if (existing) {
    if (role === 'student' && existing.role !== Role.STUDENT) {
      throw new AppError(403, 'This account is not a student account');
    }
    if (role === 'staff' && existing.role === Role.STUDENT) {
      throw new AppError(403, 'Use a staff account for faculty sign-in');
    }

    if (existing.authProvider === AuthProvider.LOCAL && existing.passwordHash) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          authProvider:
            provider === 'google' ? AuthProvider.GOOGLE : AuthProvider.MICROSOFT,
          name,
        },
      });
    }

    return existing;
  }

  if (!env.oauthAutoProvision) {
    throw new AppError(
      403,
      'No Campus360 account exists for this email. Ask your administrator to provision access.',
    );
  }

  const school = await prisma.school.findFirst();
  if (!school) {
    throw new AppError(500, 'No school configured');
  }

  return prisma.user.create({
    data: {
      email,
      name,
      role: role === 'staff' ? Role.STAFF : Role.STUDENT,
      schoolId: school.id,
      authProvider:
        provider === 'google' ? AuthProvider.GOOGLE : AuthProvider.MICROSOFT,
      ...(role === 'student'
        ? {
            student: {
              create: { schoolId: school.id },
            },
          }
        : {}),
    },
    include: { school: true, student: true },
  });
}

export async function completeOAuthCallback(
  provider: OAuthProviderId,
  code: string,
  stateToken: string,
) {
  const state = decodeOAuthState(stateToken);
  if (state.provider !== provider) {
    throw new AppError(400, 'OAuth provider mismatch');
  }

  if (!providerConfigured(provider)) {
    throw new AppError(503, `${provider} sign-in is not configured yet`);
  }

  const redirectUri = oauthRedirectUri(provider);
  let profile: Record<string, unknown>;

  if (provider === 'google') {
    const token = await exchangeOAuthCode('https://oauth2.googleapis.com/token', {
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    profile = await fetchOAuthProfile(
      'https://openidconnect.googleapis.com/v1/userinfo',
      token.access_token,
    );
  } else {
    const tenant = env.microsoftOAuthTenant;
    const token = await exchangeOAuthCode(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        code,
        client_id: env.MICROSOFT_CLIENT_ID!,
        client_secret: env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
    );
    profile = await fetchOAuthProfile('https://graph.microsoft.com/v1.0/me', token.access_token);
  }

  const email = profileEmail(provider, profile);
  if (!email) {
    throw new AppError(502, 'OAuth provider did not return an email address');
  }

  if (!isEmailDomainAllowed(provider, email)) {
    throw new AppError(403, 'This email domain is not allowed for sign-in');
  }

  if (provider === 'google' && env.GOOGLE_OAUTH_HD) {
    const hostedDomain =
      typeof profile.hd === 'string' ? profile.hd.toLowerCase() : emailDomain(email);
    if (hostedDomain !== env.GOOGLE_OAUTH_HD.toLowerCase()) {
      throw new AppError(403, 'Please use your school Google account');
    }
  }

  const name = profileName(provider, profile);
  const user = await resolveUser(provider, state.role, email, name);

  await logAction(user.id, `auth.oauth.${provider}`, { email });

  return {
    user,
    role: state.role,
  };
}

function emailDomain(email: string) {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

export function oauthSuccessRedirect(role: OAuthState['role']) {
  const base = env.CORS_ORIGIN.replace(/\/$/, '');
  const destination = role === 'staff' ? '/staff-dashboard' : '/dashboard';
  return `${base}/login/oauth-callback?next=${encodeURIComponent(destination)}`;
}

export function oauthErrorRedirect(message: string) {
  const base = env.CORS_ORIGIN.replace(/\/$/, '');
  return `${base}/login/oauth-callback?error=${encodeURIComponent(message)}`;
}
