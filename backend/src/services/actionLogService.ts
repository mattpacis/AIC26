import { prisma } from '../lib/db.js';

export async function logAction(
  userId: string | null,
  action: string,
  details: Record<string, unknown>,
) {
  return prisma.actionLog.create({
    data: {
      userId,
      action,
      details: JSON.stringify(details),
    },
  });
}
