import { MessageSender } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { type AuthContext } from '../lib/permissions.js';
import { logAction } from './actionLogService.js';
import { generateAgentReply } from './agentProvider.js';

const GREETING =
  "Hi! I'm your Campus360 AI. You don't need to know which office handles your concern — just ask me anything and I'll take care of it.";

export async function listThreads(userId: string) {
  return prisma.chatThread.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

export async function createThread(userId: string, schoolId: string, title?: string) {
  const thread = await prisma.chatThread.create({
    data: {
      userId,
      schoolId,
      title: title ?? 'AI Helpdesk',
    },
  });

  const greeting = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      sender: MessageSender.ASSISTANT,
      content: GREETING,
    },
  });

  await logAction(userId, 'chat.thread.create', { threadId: thread.id });

  return {
    thread,
    greeting,
  };
}

export async function getThreadMessages(threadId: string, userId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
  });

  if (!thread) {
    return null;
  }

  return prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function sendChatMessage(
  ctx: AuthContext,
  message: string,
  threadId?: string,
) {
  let thread = threadId
    ? await prisma.chatThread.findFirst({
        where: { id: threadId, userId: ctx.userId },
      })
    : null;

  if (!thread) {
    const created = await createThread(ctx.userId, ctx.schoolId);
    thread = created.thread;
  }

  const userMessage = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      sender: MessageSender.USER,
      content: message,
    },
  });

  const priorMessages = await prisma.chatMessage.findMany({
    where: {
      threadId: thread.id,
      id: { not: userMessage.id },
    },
    orderBy: { createdAt: 'asc' },
    take: 12,
  });

  const { reply: replyText, agentMode } = await generateAgentReply({
    ctx,
    message,
    threadId: thread.id,
    history: priorMessages.map((entry) => ({
      role: entry.sender === MessageSender.USER ? 'user' : 'assistant',
      content: entry.content,
    })),
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      sender: MessageSender.ASSISTANT,
      content: replyText,
    },
  });

  await prisma.chatThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  await logAction(ctx.userId, 'chat.message.send', {
    threadId: thread.id,
    messageId: userMessage.id,
    agentMode,
  });

  return {
    threadId: thread.id,
    userMessage,
    assistantMessage,
    reply: replyText,
    agentMode,
  };
}

export function serializeMessage(message: {
  id: string;
  sender: MessageSender;
  content: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    sender: message.sender.toLowerCase(),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}
