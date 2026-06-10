import { TicketStatus, TicketUrgency } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { type AuthContext, assertStaff, staffDepartmentScope } from '../lib/permissions.js';

function formatDurationHours(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

export async function getStaffAnalytics(ctx: AuthContext) {
  assertStaff(ctx);

  const department = staffDepartmentScope(ctx);
  const ticketWhere = {
    schoolId: ctx.schoolId,
    ...(department ? { department } : {}),
  };

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    openCount,
    progressCount,
    scheduledCount,
    resolvedCount,
    lowCount,
    mediumCount,
    highCount,
    resolvedThisWeek,
    recentResolved,
    totalOpenQueue,
  ] = await Promise.all([
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.OPEN },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.IN_PROGRESS },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.PENDING },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.RESOLVED },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, urgency: TicketUrgency.LOW, status: { not: TicketStatus.RESOLVED } },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, urgency: TicketUrgency.MEDIUM, status: { not: TicketStatus.RESOLVED } },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, urgency: TicketUrgency.HIGH, status: { not: TicketStatus.RESOLVED } },
    }),
    prisma.ticket.count({
      where: {
        ...ticketWhere,
        status: TicketStatus.RESOLVED,
        updatedAt: { gte: weekAgo },
      },
    }),
    prisma.ticket.findMany({
      where: {
        ...ticketWhere,
        status: TicketStatus.RESOLVED,
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.ticket.count({
      where: {
        ...ticketWhere,
        status: { not: TicketStatus.RESOLVED },
      },
    }),
  ]);

  const resolutionDurations = recentResolved
    .map((ticket) => ticket.updatedAt.getTime() - ticket.createdAt.getTime())
    .filter((ms) => ms > 0);

  const avgResolutionMs =
    resolutionDurations.length > 0
      ? resolutionDurations.reduce((sum, ms) => sum + ms, 0) / resolutionDurations.length
      : null;

  const targetHours = 48;
  const withinTarget =
    resolutionDurations.length > 0
      ? Math.round(
          (resolutionDurations.filter((ms) => ms <= targetHours * 60 * 60 * 1000).length /
            resolutionDurations.length) *
            100,
        )
      : null;

  return {
    summary: {
      queueCount: totalOpenQueue,
      openCount,
      progressCount,
      scheduledCount,
      resolvedCount,
      resolvedThisWeek,
    },
    urgency: {
      low: lowCount,
      medium: mediumCount,
      high: highCount,
    },
    resolution: {
      average: formatDurationHours(avgResolutionMs ?? NaN),
      withinTargetPercent: withinTarget,
      targetLabel: '≤ 2 days',
      sampleSize: resolutionDurations.length,
    },
    statusBreakdown: [
      { key: 'open', label: 'Action needed', count: openCount },
      { key: 'progress', label: 'In progress', count: progressCount },
      { key: 'sched', label: 'Scheduled', count: scheduledCount },
      { key: 'resolved', label: 'Resolved', count: resolvedCount },
    ],
  };
}
