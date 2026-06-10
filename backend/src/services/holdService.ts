import { HoldStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { type AuthContext } from '../lib/permissions.js';

function formatDisplayDateTime(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function listWhere(ctx: AuthContext) {
  const where: {
    schoolId: string;
    studentUserId?: string;
    status?: HoldStatus;
  } = {
    schoolId: ctx.schoolId,
    status: HoldStatus.ACTIVE,
  };

  if (ctx.role === 'STUDENT') {
    where.studentUserId = ctx.userId;
  }

  return where;
}

export async function listHolds(ctx: AuthContext) {
  const holds = await prisma.studentHold.findMany({
    where: listWhere(ctx),
    orderBy: { createdAt: 'desc' },
  });

  return holds.map((hold) => ({
    id: hold.id,
    title: hold.title,
    description: hold.description,
    department: hold.department,
    status: hold.status.toLowerCase() as 'active' | 'cleared',
    createdAt: hold.createdAt.toISOString(),
    updatedAt: hold.updatedAt.toISOString(),
    label: hold.description
      ? `${hold.title} — ${hold.description}`
      : hold.title,
  }));
}

export async function countActiveHolds(ctx: AuthContext) {
  return prisma.studentHold.count({
    where: listWhere(ctx),
  });
}

export async function getHoldSummary(ctx: AuthContext) {
  const holds = await listHolds(ctx);

  const allHolds = await prisma.studentHold.findMany({
    where: {
      schoolId: ctx.schoolId,
      ...(ctx.role === 'STUDENT' ? { studentUserId: ctx.userId } : {}),
    },
    select: { status: true },
  });

  const clearedCount = allHolds.filter(
    (hold) => hold.status === HoldStatus.CLEARED,
  ).length;

  return {
    activeCount: holds.length,
    clearedCount,
    totalCount: allHolds.length,
    holds,
    lastUpdated: holds[0]
      ? formatDisplayDateTime(new Date(holds[0].updatedAt))
      : null,
  };
}
