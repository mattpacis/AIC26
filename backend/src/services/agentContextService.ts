import { type AuthContext, AppError } from '../lib/permissions.js';
import { getAgentMode } from '../lib/env.js';
import { getUserById } from './authService.js';
import { getAppointmentSummary } from './appointmentService.js';
import { listAppointments } from './appointmentService.js';
import { countOpenTickets, listTickets } from './ticketService.js';

export async function buildAgentContext(ctx: AuthContext, threadId?: string) {
  if (ctx.role !== 'STUDENT') {
    throw new AppError(
      403,
      'Campus360 student agent context is only available for student accounts',
    );
  }

  const user = await getUserById(ctx.userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const [appointmentSummary, openTicketCount, tickets] = await Promise.all([
    getAppointmentSummary(ctx),
    countOpenTickets(ctx),
    listTickets(ctx),
  ]);

  const nextAppt = appointmentSummary.nextAppointment;
  const upcoming = await listAppointments(ctx, { status: 'upcoming' });
  const nextAppointmentDetail = upcoming[0] ?? null;

  return {
    agentContractVersion: '1.0',
    agentMode: getAgentMode(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase(),
      school: {
        id: user.school.id,
        name: user.school.name,
      },
      student: user.student
        ? {
            id: user.student.id,
            studentNumber: user.student.studentNumber,
            grade: user.student.grade,
            yearLevel: user.student.yearLevel ?? user.student.grade,
            program: user.student.program,
            college: user.student.college,
          }
        : null,
    },
    summary: {
      openTicketCount,
      upcomingAppointmentCount: appointmentSummary.upcomingCount,
      nextAppointment: nextAppointmentDetail
        ? {
            id: nextAppointmentDetail.id,
            title: nextAppointmentDetail.title,
            date: nextAppointmentDetail.date,
            time: nextAppointmentDetail.time,
            department: nextAppointmentDetail.department,
            location: nextAppointmentDetail.location,
          }
        : nextAppt
          ? {
              title: nextAppt.title,
              date: nextAppt.label,
              time: null,
              department: null,
              location: null,
            }
          : null,
    },
    recentTickets: tickets.slice(0, 5).map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      concern: ticket.concern,
      status: ticket.status,
      statusLabel: ticket.statusLabel,
      department: ticket.department,
    })),
    threadId: threadId ?? null,
  };
}
