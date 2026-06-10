import crypto from 'node:crypto';
import type { Request } from 'express';
import { env } from './env.js';
import { AppError } from './permissions.js';

export type OAuthProviderId = 'google' | 'microsoft';

export type OAuthState = {
  provider: OAuthProviderId;
  role: 'student' | 'staff';
  nonce: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8')
    .toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  return crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(value)
    .digest('base64url');
}

export function encodeOAuthState(state: OAuthState) {
  const payload = base64UrlEncode(JSON.stringify(state));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function decodeOAuthState(token: string): OAuthState {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || sign(payload) !== signature) {
    throw new AppError(400, 'Invalid OAuth state');
  }

  const parsed = JSON.parse(base64UrlDecode(payload)) as OAuthState;
  if (
    (parsed.provider !== 'google' && parsed.provider !== 'microsoft') ||
    (parsed.role !== 'student' && parsed.role !== 'staff') ||
    typeof parsed.nonce !== 'string'
  ) {
    throw new AppError(400, 'Invalid OAuth state payload');
  }

  return parsed;
}

export function oauthRedirectUri(provider: OAuthProviderId) {
  return `${env.OAUTH_CALLBACK_BASE_URL}/api/auth/${provider}/callback`;
}

export function emailDomain(email: string) {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

export function isEmailDomainAllowed(
  provider: OAuthProviderId,
  email: string,
) {
  const domain = emailDomain(email);
  const allowed =
    provider === 'google'
      ? env.oauthGoogleAllowedDomains
      : env.oauthMicrosoftAllowedDomains;

  if (allowed.length === 0) return true;
  return allowed.includes(domain);
}

export function getOAuthQueryParam(req: Request, key: string) {
  const value = req.query[key];
  return typeof value === 'string' ? value : undefined;
}

export async function exchangeOAuthCode(
  tokenUrl: string,
  params: Record<string, string>,
) {
  const body = new URLSearchParams(params);
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, `OAuth token exchange failed: ${text.slice(0, 200)}`);
  }

  return (await response.json()) as {
    access_token: string;
    id_token?: string;
    token_type: string;
  };
}

export async function fetchOAuthProfile(
  userInfoUrl: string,
  accessToken: string,
) {
  const response = await fetch(userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, `OAuth profile fetch failed: ${text.slice(0, 200)}`);
  }

  return (await response.json()) as Record<string, unknown>;
}
