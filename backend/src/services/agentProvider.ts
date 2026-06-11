import { type AuthContext } from '../lib/permissions.js';
import { env, getAgentMode } from '../lib/env.js';
import { buildAgentContext } from './agentContextService.js';
import { logAction } from './actionLogService.js';

export type AgentHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AgentTurnInput = {
  ctx: AuthContext;
  message: string;
  threadId: string;
  history: AgentHistoryMessage[];
};

export type AgentTurnResult = {
  reply: string;
  agentMode: 'microsoft' | 'dev_bridge';
};

type AgentContextPayload = Awaited<ReturnType<typeof buildAgentContext>>;

async function callMicrosoftAgent(
  input: AgentTurnInput,
  context: AgentContextPayload,
): Promise<string> {
  const endpoint = env.MICROSOFT_AGENT_ENDPOINT;
  if (!endpoint) {
    throw new Error('Microsoft agent endpoint is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (env.MICROSOFT_AGENT_API_KEY) {
    headers.Authorization = `Bearer ${env.MICROSOFT_AGENT_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: input.message,
      threadId: input.threadId,
      context,
      history: input.history,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Microsoft agent request failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as { reply?: string; message?: string };
  const reply = payload.reply ?? payload.message;

  if (!reply?.trim()) {
    throw new Error('Microsoft agent returned an empty reply');
  }

  return reply.trim();
}

function firstName(fullName: string) {
  return fullName.split(' ')[0] ?? fullName;
}

export function buildDevBridgeReply(message: string, context: AgentContextPayload) {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const name = firstName(context.user.name);

  if (
    lower.includes('hello') ||
    lower.includes('hi') ||
    lower.includes('help') ||
    lower === 'hey'
  ) {
    const parts = [
      `Hi ${name}! I'm Campus360 AI.`,
      `You have ${context.summary.openTicketCount} open ticket${context.summary.openTicketCount === 1 ? '' : 's'}.`,
    ];
    if (context.summary.nextAppointment) {
      parts.push(
        `Your next appointment is ${context.summary.nextAppointment.title} on ${context.summary.nextAppointment.date}${context.summary.nextAppointment.time ? ` at ${context.summary.nextAppointment.time}` : ''}.`,
      );
    }
    parts.push('Ask me about tickets or appointments — I answer using your live Campus360 data.');
    return parts.join(' ');
  }

  if (
    lower.includes('ticket') ||
    lower.includes('wifi') ||
    lower.includes('wi-fi') ||
    lower.includes('internet') ||
    lower.includes('certificate') ||
    lower.includes('medical')
  ) {
    if (context.recentTickets.length === 0) {
      return `${name}, you don't have any tickets yet. Tell me your concern and department (for example IT Department or Campus Health) and I can help you create one once the Copilot connector is live.`;
    }
    const lines = context.recentTickets.slice(0, 4).map(
      (ticket) =>
        `• ${ticket.id} — ${ticket.concern} (${ticket.statusLabel}, ${ticket.department})`,
    );
    return `${name}, here are your recent tickets:\n${lines.join('\n')}\nOpen any ticket in Campus360 for full details, or ask about a specific ticket number.`;
  }

  if (
    lower.includes('appointment') ||
    lower.includes('schedule') ||
    lower.includes('book')
  ) {
    if (!context.summary.nextAppointment) {
      return `${name}, you don't have an upcoming appointment scheduled. Tell me the department and preferred timing and I can help once appointment booking is connected through Copilot tools.`;
    }
    const appt = context.summary.nextAppointment;
    return `${name}, your next appointment is ${appt.title} on ${appt.date}${appt.time ? ` at ${appt.time}` : ''}${appt.department ? ` (${appt.department})` : ''}${appt.location ? ` — ${appt.location}` : ''}.`;
  }

  return `${name}, I received your message. I'm running in dev bridge mode with your live Campus360 context (tickets, appointments). The Microsoft Copilot agent isn't connected yet — once your team adds MICROSOFT_AGENT_ENDPOINT, replies will come from Copilot Studio while still using the same backend tools.\n\nYou asked: "${trimmed.slice(0, 200)}"`;
}

export async function generateAgentReply(
  input: AgentTurnInput,
): Promise<AgentTurnResult> {
  if (input.ctx.role !== 'STUDENT') {
    return {
      reply:
        'Campus360 AI helpdesk is for student accounts. Sign in as a student to get personalized help with tickets and appointments.',
      agentMode: getAgentMode(),
    };
  }

  const context = await buildAgentContext(input.ctx, input.threadId);
  const agentMode = getAgentMode();

  if (agentMode === 'microsoft') {
    try {
      const reply = await callMicrosoftAgent(input, context);
      await logAction(input.ctx.userId, 'agent.microsoft.reply', {
        threadId: input.threadId,
      });
      return { reply, agentMode };
    } catch (err) {
      console.error('Microsoft agent failed, falling back to dev bridge:', err);
      const reply = buildDevBridgeReply(input.message, context);
      return { reply, agentMode: 'dev_bridge' };
    }
  }

  const reply = buildDevBridgeReply(input.message, context);
  await logAction(input.ctx.userId, 'agent.dev_bridge.reply', {
    threadId: input.threadId,
  });

  return { reply, agentMode: 'dev_bridge' };
}
