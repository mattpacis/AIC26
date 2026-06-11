import { AppointmentStatus, TicketStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { type AuthContext, assertStaff, staffDepartmentScope } from '../lib/permissions.js';
import { listStaffQueueTickets } from './staffTicketService.js';
import { getStaffAnalytics } from './staffAnalyticsService.js';

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function formatAppointmentTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export async function getStaffDashboard(ctx: AuthContext) {
  assertStaff(ctx);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { id: true, name: true, email: true, role: true, department: true },
  });

  const department = staffDepartmentScope(ctx);
  const ticketWhere = {
    schoolId: ctx.schoolId,
    ...(department ? { department } : {}),
  };

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [
    queueCount,
    openCount,
    scheduledCount,
    progressCount,
    resolvedCount,
    todayAppointments,
    queuePreview,
    analytics,
  ] = await Promise.all([
    prisma.ticket.count({
      where: {
        ...ticketWhere,
        status: { not: TicketStatus.RESOLVED },
      },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.OPEN },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.PENDING },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.IN_PROGRESS },
    }),
    prisma.ticket.count({
      where: { ...ticketWhere, status: TicketStatus.RESOLVED },
    }),
    prisma.appointment.findMany({
      where: {
        schoolId: ctx.schoolId,
        ...(department ? { department } : {}),
        status: AppointmentStatus.SCHEDULED,
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        studentUser: { select: { name: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    listStaffQueueTickets(ctx, { limit: 5 }),
    getStaffAnalytics(ctx),
  ]);

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase(),
      initials,
      department: user.department,
      roleLabel: user.department ? `${user.department} · Staff` : 'Staff',
    },
    summary: {
      queueCount,
      openCount,
      scheduledCount,
      progressCount,
      resolvedCount,
      todayAppointmentCount: todayAppointments.length,
    },
    todayAppointments: todayAppointments.map((appt) => ({
      id: appt.id,
      time: formatAppointmentTime(appt.scheduledAt),
      title: appt.title,
      department: appt.department,
      studentName: appt.studentUser.name,
      studentEmail: appt.studentUser.email,
      location: appt.location,
      ticketNumber: appt.ticketNumber ? `#${appt.ticketNumber}` : null,
    })),
    queuePreview,
    resolution: analytics.resolution,
  };
}
