import type { StaffQueueTicket } from '../api/client';

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function exportStaffTicketsCsv(tickets: StaffQueueTicket[]) {
  const headers = [
    'Ticket ID',
    'Concern',
    'Student',
    'Email',
    'Status',
    'Urgency',
    'Assigned To',
    'Last Update',
  ];

  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.concern,
    ticket.studentName,
    ticket.studentEmail,
    ticket.statusLabel,
    ticket.urgencyLabel,
    ticket.info.assignedTo,
    ticket.time,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `campus360-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
