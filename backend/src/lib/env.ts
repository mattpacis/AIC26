import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(8),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CAMPUS360_AGENT_API_KEY: z.string().min(8).optional(),
  MICROSOFT_AGENT_ENDPOINT: z.string().url().optional(),
  MICROSOFT_AGENT_API_KEY: z.string().min(1).optional(),
  MICROSOFT_DIRECT_LINE_SECRET: z.string().min(1).optional(),
  OAUTH_CALLBACK_BASE_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_HD: z.string().min(1).optional(),
  MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
  MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
  MICROSOFT_OAUTH_TENANT: z.string().min(1).optional(),
  OAUTH_GOOGLE_ALLOWED_DOMAINS: z.string().optional(),
  OAUTH_MICROSOFT_ALLOWED_DOMAINS: z.string().optional(),
  OAUTH_AUTO_PROVISION: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const parsed = envSchema.parse(process.env);

const defaultDevAgentKey = 'campus360-dev-agent-key';

function parseDomainList(raw: string | undefined) {
  if (!raw?.trim()) return [] as string[];
  return raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  ...parsed,
  agentApiKey:
    parsed.CAMPUS360_AGENT_API_KEY ??
    (parsed.NODE_ENV === 'development' ? defaultDevAgentKey : undefined),
  oauthCallbackBaseUrl:
    parsed.OAUTH_CALLBACK_BASE_URL ?? `http://localhost:${parsed.PORT}`,
  oauthGoogleAllowedDomains: parseDomainList(parsed.OAUTH_GOOGLE_ALLOWED_DOMAINS),
  oauthMicrosoftAllowedDomains: parseDomainList(
    parsed.OAUTH_MICROSOFT_ALLOWED_DOMAINS,
  ),
  oauthAutoProvision: parsed.OAUTH_AUTO_PROVISION ?? false,
  microsoftOAuthTenant: parsed.MICROSOFT_OAUTH_TENANT ?? 'common',
};

export function getAgentMode(): 'microsoft' | 'dev_bridge' {
  return env.MICROSOFT_AGENT_ENDPOINT ? 'microsoft' : 'dev_bridge';
}

if (!env.agentApiKey && parsed.NODE_ENV === 'production') {
  throw new Error('CAMPUS360_AGENT_API_KEY is required in production');
}
