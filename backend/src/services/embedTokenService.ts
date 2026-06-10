import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../lib/env.js';
import { AppError } from '../lib/permissions.js';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

type EmbedTokenPayload = {
  userId: string;
  email: string;
  exp: number;
};

function sign(payload: string) {
  return createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
}

function encodePayload(payload: EmbedTokenPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): EmbedTokenPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as EmbedTokenPayload;

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      throw new Error('Invalid embed token shape');
    }

    return parsed;
  } catch {
    throw new AppError(401, 'Invalid embed token');
  }
}

export function createEmbedToken(userId: string, email: string) {
  const payload: EmbedTokenPayload = {
    userId,
    email: email.toLowerCase(),
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encoded = encodePayload(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyEmbedToken(token: string) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    throw new AppError(401, 'Invalid embed token');
  }

  const expected = sign(encoded);
  const actual = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (actual.length !== expectedBuf.length || !timingSafeEqual(actual, expectedBuf)) {
    throw new AppError(401, 'Invalid embed token');
  }

  const payload = decodePayload(encoded);
  if (payload.exp < Date.now()) {
    throw new AppError(401, 'Embed token expired');
  }

  return payload;
}
