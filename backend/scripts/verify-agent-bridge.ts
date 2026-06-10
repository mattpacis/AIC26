/**
 * Verifies the Copilot agent bridge without needing Microsoft credentials.
 * Run: npm run verify:agent  (backend must be on http://localhost:3001)
 */
import { PrismaClient } from '@prisma/client';
import { env } from '../src/lib/env.js';

const BASE = env.oauthCallbackBaseUrl;
const API_KEY = env.agentApiKey ?? 'campus360-dev-agent-key';

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep text
  }
  return { status: response.status, body };
}

async function main() {
  const prisma = new PrismaClient();
  const student = await prisma.user.findUnique({
    where: { email: 'alex.johnson@university.edu' },
  });

  if (!student) {
    throw new Error('Seed student not found. Run: npm run db:seed');
  }

  console.log('Campus360 agent bridge verification\n');

  const health = await request('/api/agent/health');
  console.log('GET /api/agent/health', health.status, health.body);

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'X-Campus360-User-Id': student.id,
    'Content-Type': 'application/json',
  };

  const context = await request('/api/agent/context', { headers });
  console.log('GET /api/agent/context', context.status);

  const holds = await request('/api/agent/tools/list_holds', {
    method: 'POST',
    headers,
    body: '{}',
  });
  console.log('POST /api/agent/tools/list_holds', holds.status);

  const invokeHolds = await request('/api/agent/invoke', {
    method: 'POST',
    headers,
    body: JSON.stringify({ toolName: 'list_holds' }),
  });
  console.log('POST /api/agent/invoke (list_holds)', invokeHolds.status);

  const invokeTicket = await request('/api/agent/invoke', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      toolName: 'create_ticket',
      concern: 'Verify bridge ticket',
      department: 'IT Department',
    }),
  });
  console.log('POST /api/agent/invoke (create_ticket)', invokeTicket.status);

  const tools = await request('/api/agent/tools', { headers });
  console.log('GET /api/agent/tools', tools.status);

  const mock = await request('/api/agent/mock-copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What holds do I have?',
      context:
        typeof context.body === 'object' &&
        context.body !== null &&
        'context' in context.body
          ? (context.body as { context: unknown }).context
          : {},
    }),
  });
  console.log('POST /api/agent/mock-copilot', mock.status);

  const failures = [health, context, holds, invokeHolds, invokeTicket, tools, mock].filter(
    (result) => result.status >= 400,
  );

  if (failures.length > 0) {
    console.error('\nSome checks failed. Is the backend running? npm run dev');
    process.exit(1);
  }

  console.log('\nAll agent bridge checks passed.');
  console.log(`Student user id for Copilot connectors: ${student.id}`);
  console.log(`Agent API key: ${API_KEY}`);
  console.log(
    '\nNext: point MICROSOFT_AGENT_ENDPOINT at /api/agent/mock-copilot to test in-app microsoft mode locally.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  });
