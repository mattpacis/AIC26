import type { AppointmentRecord } from '../api/client';

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportStaffAppointmentsCsv(appointments: AppointmentRecord[]) {
  const headers = [
    'Title',
    'Student',
    'Department',
    'Date',
    'Time',
    'Location',
    'Status',
    'Ticket',
  ];

  const rows = appointments.map((appt) => [
    appt.title,
    appt.studentName ?? '—',
    appt.department,
    appt.date,
    appt.time,
    appt.location ?? '—',
    appt.status,
    appt.ticketNumber ?? '—',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `campus360-appointments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
