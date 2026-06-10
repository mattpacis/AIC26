import type { TicketSummary } from '../api/client';

export const TICKET_BADGE_CLASS: Record<TicketSummary['status'], string> = {
  resolved: 'student-dashboard__badge-resolved',
  progress: 'student-dashboard__badge-progress',
  pending: 'student-dashboard__badge-pending',
  open: 'student-dashboard__badge-open',
};

export const TICKET_DETAIL_BADGE_CLASS: Record<TicketSummary['status'], string> = {
  resolved: 'student-ticket-detail__b-resolved',
  progress: 'student-ticket-detail__b-progress',
  pending: 'student-ticket-detail__b-pending',
  open: 'student-ticket-detail__b-open',
};

export const TICKET_URGENCY_CLASS: Record<TicketSummary['urgency'], string> = {
  low: 'student-dashboard__urgency-low',
  med: 'student-dashboard__urgency-med',
  high: 'student-dashboard__urgency-high',
};

export const TICKET_URGENCY_BADGE_CLASS: Record<TicketSummary['urgency'], string> = {
  low: 'student-ticket-detail__b-low',
  med: 'student-ticket-detail__b-med',
  high: 'student-ticket-detail__b-high',
};

export function urgencyLabelBadgeClass(label?: string | null) {
  const lower = (label ?? '').toLowerCase();
  if (lower.includes('high')) return 'student-ticket-detail__b-high';
  if (lower.includes('med')) return 'student-ticket-detail__b-med';
  return 'student-ticket-detail__b-low';
}

export function urgencyLabelAppointmentBadgeClass(label?: string | null) {
  const lower = (label ?? '').toLowerCase();
  if (lower.includes('high')) return 'student-appointments__b-high';
  if (lower.includes('med')) return 'student-appointments__b-med';
  return 'student-appointments__b-low';
}

export function handleChatTextareaKeyDown(
  event: { key: string; shiftKey: boolean; preventDefault: () => void },
  onSend: () => void,
) {
  if (event.key === 'Enter' && event.shiftKey) return;
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    onSend();
  }
}
