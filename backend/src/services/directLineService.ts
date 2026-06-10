import { env } from '../lib/env.js';
import { AppError } from '../lib/permissions.js';

const DIRECT_LINE_TOKEN_URL =
  'https://directline.botframework.com/v3/directline/tokens/generate';

export type DirectLineTokenResponse = {
  token: string;
  conversationId: string;
  expires_in: number;
};

export async function createDirectLineToken(): Promise<DirectLineTokenResponse> {
  const secret = env.MICROSOFT_DIRECT_LINE_SECRET;
  if (!secret) {
    throw new AppError(
      503,
      'Direct Line is not configured. Set MICROSOFT_DIRECT_LINE_SECRET in backend/.env',
    );
  }

  const response = await fetch(DIRECT_LINE_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AppError(
      502,
      `Failed to create Direct Line token (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }

  const payload = (await response.json()) as Partial<DirectLineTokenResponse>;
  if (!payload.token || !payload.conversationId) {
    throw new AppError(502, 'Direct Line token response was invalid');
  }

  return {
    token: payload.token,
    conversationId: payload.conversationId,
    expires_in: payload.expires_in ?? 1800,
  };
}
