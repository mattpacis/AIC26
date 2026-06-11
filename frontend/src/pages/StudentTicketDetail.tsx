import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconCalendarCheck,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconHeartRateMonitor,
  IconMapPin,
  IconMessage,
  IconMessageChatbot,
  IconRobot,
  IconSend,
} from '@tabler/icons-react';
import {
  addTicketReply,
  getMe,
  getTicket,
  resolveTicket,
  type TicketDetail,
  type User,
} from '../api/client';
import { StudentSidebar } from '../components/StudentSidebar';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { EmptyState } from '../components/EmptyState';
import { SkeletonBlock } from '../components/Skeleton';
import { usePageTitle } from '../hooks/usePageTitle';
import { useShellScale } from '../hooks/useShellScale';
import {
  handleChatTextareaKeyDown,
  TICKET_DETAIL_BADGE_CLASS,
  TICKET_URGENCY_BADGE_CLASS,
} from '../utils/ticketDisplay';
import { getRelatedTicketIcon, getTrackStepIcon } from '../utils/ticketIcons';
import { formatRelativeTime } from '../utils/relativeTime';
import './StudentDashboard.css';
import './StudentTicketDetail.css';

export function StudentTicketDetail() {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  usePageTitle(ticketId ? `Ticket #${ticketId}` : 'Ticket');
  const { outerRef, shellRef } = useShellScale();

  const [user, setUser] = useState<User | null>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);


  useEffect(() => {
    let cancelled = false;

    async function loadTicket(silent = false) {
      if (!ticketId) {
        setError('Ticket not found');
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const [me, ticketData] = await Promise.all([getMe(), getTicket(ticketId)]);
        if (cancelled) return;
        setUser(me.user);
        setTicket(ticketData.ticket);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load ticket';
          if (message.toLowerCase().includes('authentication')) {
            navigate('/login');
            return;
          }
          if (!silent) {
            setError(message);
          }
        }
      } finally {
        if (!cancelled && !silent) {
          setLoading(false);
        }
      }
    }

    void loadTicket();

    function handleFocus() {
      void loadTicket(true);
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadTicket(true);
      }
    }, 20000);

    window.addEventListener('focus', handleFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [navigate, ticketId]);

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="student-dashboard__outer" ref={outerRef}>
          <div className="student-dashboard__shell" ref={shellRef}>
            <StudentSidebar />
            <div className="student-dashboard__main">
              <div className="student-ticket-detail__content" style={{ padding: 24 }}>
                <SkeletonBlock lines={5} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket || error) {
    return (
      <div className="student-dashboard">
        <div className="student-dashboard__outer">
          <div className="student-dashboard__main" style={{ padding: 32 }}>
            <EmptyState
              title={error ?? 'Ticket not found'}
              description="This ticket may have been removed or you may not have access."
              action={
                <button
                  type="button"
                  className="student-tickets__create-btn"
                  onClick={() => navigate('/tickets')}
                >
                  Back to tickets
                </button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  async function sendReply() {
    const trimmed = reply.trim();
    if (!trimmed || sending || !ticketId || !ticket) return;

    setSending(true);
    setError(null);
    try {
      const { ticket: updated } = await addTicketReply(ticketId, trimmed);
      setTicket(updated);
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  async function handleSendReply(event: React.FormEvent) {
    event.preventDefault();
    await sendReply();
  }

  async function handleResolveTicket() {
    if (!ticketId || !ticket?.canResolve || resolving) return;

    const confirmed = window.confirm(
      `Mark ticket ${ticket.id} as resolved? You will not be able to send follow-ups after this.`,
    );
    if (!confirmed) return;

    setResolving(true);
    setError(null);
    try {
      const { ticket: updated } = await resolveTicket(ticketId);
      setTicket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="student-dashboard student-ticket-detail">
      <h2 className="student-ticket-detail__sr-only">
        Campus360 student ticket detail view showing ticket status tracker, AI
        updates, activity timeline, and a follow-up reply box
      </h2>

      <div className="student-dashboard__outer" ref={outerRef}>
        <div className="student-dashboard__shell" ref={shellRef}>
          <StudentSidebar />

          <div className="student-dashboard__main">
            <header className="student-dashboard__topbar">
              <nav className="student-ticket-detail__breadcrumb" aria-label="Breadcrumb">
                <button
                  type="button"
                  className="student-ticket-detail__breadcrumb-link"
                  onClick={() => navigate('/tickets')}
                >
                  My Tickets
                </button>
                <span className="student-ticket-detail__breadcrumb-sep">/</span>
                <span className="student-ticket-detail__breadcrumb-current">
                  {ticket.id} — {ticket.shortTitle}
                </span>
              </nav>
              {user && (
                <StudentTopbar user={user} onUserUpdated={setUser} />
              )}
            </header>

            <div className="student-ticket-detail__content">
              <div className="student-ticket-detail__main-col">
                <div className="student-ticket-detail__page-header">
                  <div>
                    <h1 className="student-ticket-detail__page-title">
                      {ticket.title}
                    </h1>
                    <div className="student-ticket-detail__page-meta">
                      <span className="student-ticket-detail__page-id">
                        {ticket.id}
                      </span>
                      <span style={{ color: '#d1d5db' }}>·</span>
                      <span
                        className={`student-ticket-detail__badge ${TICKET_DETAIL_BADGE_CLASS[ticket.status]}`}
                      >
                        {ticket.statusLabel}
                      </span>
                      <span className="student-ticket-detail__badge student-ticket-detail__b-health">
                        <IconHeartRateMonitor size={11} aria-hidden />
                        {ticket.department}
                      </span>
                      <span
                        className={`student-ticket-detail__badge ${TICKET_URGENCY_BADGE_CLASS[ticket.urgency]}`}
                      >
                        {ticket.urgencyLabel} urgency
                      </span>
                      {ticket.aiTriaged && (
                        <span className="student-ticket-detail__badge student-ticket-detail__b-ai">
                          AI-triaged
                        </span>
                      )}
                      <span className="student-ticket-detail__page-submitted">
                        {ticket.submittedShort}
                      </span>
                    </div>
                  </div>
                  <div className="student-ticket-detail__header-actions">
                    {ticket.canResolve && (
                      <button
                        type="button"
                        className="student-ticket-detail__btn student-ticket-detail__btn-success"
                        onClick={() => void handleResolveTicket()}
                        disabled={resolving}
                      >
                        <IconCheck size={13} aria-hidden />
                        {resolving ? 'Resolving…' : 'Mark resolved'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="student-ticket-detail__card c360-stagger" style={{ '--c360-stagger': 0 } as CSSProperties}>
                  <div className="student-ticket-detail__card-header">
                    <div className="student-ticket-detail__card-title">
                      <IconMapPin size={15} color="#2E5BA8" aria-hidden />
                      Ticket status
                    </div>
                    <span className="student-ticket-detail__card-meta">
                      Last updated {formatRelativeTime(ticket.updatedAt)}
                    </span>
                  </div>
                  <div className="student-ticket-detail__card-body">
                    <div className="student-ticket-detail__status-track">
                      {ticket.trackSteps.map((step, index) => {
                        const StepIcon = getTrackStepIcon(step.icon);
                        const isLast = index === ticket.trackSteps.length - 1;
                        return (
                          <div
                            className="student-ticket-detail__track-step"
                            key={step.label}
                          >
                            {!isLast && (
                              <div
                                className={[
                                  'student-ticket-detail__track-line',
                                  step.lineState,
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                              />
                            )}
                            <div
                              className={`student-ticket-detail__track-dot ${step.state}`}
                            >
                              <StepIcon size={13} aria-hidden />
                            </div>
                            <div className="student-ticket-detail__track-label">
                              {step.label}
                            </div>
                            <div className="student-ticket-detail__track-sub">
                              {step.sub}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="student-ticket-detail__card c360-stagger" style={{ '--c360-stagger': 1 } as CSSProperties}>
                  <div className="student-ticket-detail__card-header">
                    <div className="student-ticket-detail__card-title">
                      <IconMessage size={15} color="#2E5BA8" aria-hidden />
                      Conversation
                    </div>
                  </div>
                  <div className="student-ticket-detail__card-body">
                    {ticket.replies.length > 0 ? (
                      <div className="student-ticket-detail__reply-thread">
                        {ticket.replies.map((item) => (
                          <div
                            key={item.id}
                            className={`student-ticket-detail__reply-message${
                              item.isStudent ? ' student' : ''
                            }`}
                          >
                            <div className="student-ticket-detail__reply-meta">
                              <strong>{item.authorName}</strong>
                              <span title={item.timeLabel}>
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>
                            <p>{item.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="student-ticket-detail__reply-empty">
                        {ticket.canReply
                          ? 'No messages yet. Send a note below — staff will see it even before someone takes your ticket.'
                          : 'This ticket is resolved. Messaging is closed.'}
                      </p>
                    )}
                    <form
                      className="student-ticket-detail__reply-box"
                      onSubmit={handleSendReply}
                    >
                      <textarea
                        className="student-ticket-detail__reply-input"
                        rows={3}
                        placeholder={
                          ticket.canReply
                            ? 'Type a message to staff about this ticket…'
                            : 'Messaging is closed for resolved tickets.'
                        }
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(event) =>
                          handleChatTextareaKeyDown(event, () => {
                            if (ticket.canReply) {
                              void sendReply();
                            }
                          })
                        }
                        disabled={!ticket.canReply}
                      />
                      <div className="student-ticket-detail__reply-actions">
                        <span className="student-ticket-detail__reply-hint">
                          {ticket.canReply
                            ? ticket.isTaken
                              ? `${ticket.assignedTo} can reply here. Enter to send, Shift+Enter for a new line.`
                              : `${ticket.department} will see your message. Staff can reply once they take your ticket. Enter to send, Shift+Enter for a new line.`
                            : 'This ticket is resolved. Messaging is closed.'}
                        </span>
                        <button
                          type="submit"
                          className="student-ticket-detail__reply-send"
                          disabled={sending || !reply.trim() || !ticket.canReply}
                        >
                          <IconSend size={13} aria-hidden />
                          Send
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="student-ticket-detail__card">
                  <div className="student-ticket-detail__card-header">
                    <div className="student-ticket-detail__card-title">
                      <IconRobot size={15} color="#7C3AED" aria-hidden />
                      AI updates
                    </div>
                    <button
                      type="button"
                      className="student-ticket-detail__view-all"
                    >
                      View all
                    </button>
                  </div>
                  <div className="student-ticket-detail__card-body compact-top">
                    {ticket.aiUpdates.map((update) => (
                      <div
                        className="student-ticket-detail__ai-update-card"
                        key={update.time}
                      >
                        <div className="student-ticket-detail__ai-update-header">
                          <IconRobot size={14} color="#7C3AED" aria-hidden />
                          <span className="student-ticket-detail__ai-update-label">
                            Campus360 AI
                          </span>
                          <span className="student-ticket-detail__ai-update-time">
                            {update.time}
                          </span>
                        </div>
                        <div className="student-ticket-detail__ai-update-body">
                          {update.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="student-ticket-detail__card">
                  <div className="student-ticket-detail__card-header">
                    <div className="student-ticket-detail__card-title">
                      <IconClock size={15} color="#2E5BA8" aria-hidden />
                      Activity timeline
                    </div>
                  </div>
                  <div className="student-ticket-detail__card-body timeline-body">
                    <div className="student-ticket-detail__timeline">
                      {ticket.timeline.map((item) => (
                        <div
                          className="student-ticket-detail__tl-item"
                          key={item.title}
                        >
                          <div className="student-ticket-detail__tl-dot-wrap">
                            <div
                              className="student-ticket-detail__tl-dot"
                              style={{ background: item.dotColor }}
                            />
                            {item.showLine && (
                              <div className="student-ticket-detail__tl-line" />
                            )}
                          </div>
                          <div className="student-ticket-detail__tl-content">
                            <div className="student-ticket-detail__tl-title">
                              {item.title}
                            </div>
                            <div className="student-ticket-detail__tl-desc">
                              {item.desc}
                            </div>
                            <div className="student-ticket-detail__tl-time">
                              {item.time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="student-ticket-detail__right-col">
                <div>
                  <div className="student-ticket-detail__section-label">
                    Ticket details
                  </div>
                  <div className="student-ticket-detail__info-panel">
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Ticket ID
                      </span>
                      <span className="student-ticket-detail__info-value student-ticket-detail__info-value-id">
                        {ticket.id}
                      </span>
                    </div>
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Status
                      </span>
                      <span className="student-ticket-detail__info-value">
                        <span className="student-ticket-detail__badge student-ticket-detail__b-progress">
                          {ticket.statusLabel}
                        </span>
                      </span>
                    </div>
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Department
                      </span>
                      <span className="student-ticket-detail__info-value">
                        {ticket.department}
                      </span>
                    </div>
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Assigned to
                      </span>
                      <span className="student-ticket-detail__info-value">
                        {ticket.assignedTo}
                      </span>
                    </div>
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Urgency
                      </span>
                      <span className="student-ticket-detail__info-value">
                        <span
                          className={`student-ticket-detail__badge ${TICKET_URGENCY_BADGE_CLASS[ticket.urgency]}`}
                        >
                          {ticket.urgencyLabel}
                        </span>
                      </span>
                    </div>
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Submitted
                      </span>
                      <span className="student-ticket-detail__info-value">
                        {ticket.submitted}
                      </span>
                    </div>
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Deadline
                      </span>
                      <span className="student-ticket-detail__info-value student-ticket-detail__info-value-warn">
                        {ticket.deadline}
                      </span>
                    </div>
                    <div className="student-ticket-detail__info-row">
                      <span className="student-ticket-detail__info-label">
                        Est. resolution
                      </span>
                      <span className="student-ticket-detail__info-value">
                        {ticket.estResolution}
                      </span>
                    </div>
                  </div>
                </div>

                {ticket.appointment && (
                  <div>
                    <div className="student-ticket-detail__section-label">
                      Appointment
                    </div>
                    <div className="student-ticket-detail__appt-panel">
                      <div className="student-ticket-detail__appt-datetime">
                        <IconCalendarCheck size={15} aria-hidden />
                        {ticket.appointment.datetime}
                      </div>
                      <div className="student-ticket-detail__appt-location">
                        {ticket.appointment.location}
                      </div>
                      <div className="student-ticket-detail__appt-assigned">
                        {ticket.appointment.assigned}
                      </div>
                      <div className="student-ticket-detail__appt-bring-label">
                        Bring on the day:
                      </div>
                      <div className="student-ticket-detail__appt-bring-list">
                        {ticket.appointment.bring.map((item) => (
                          <div
                            className="student-ticket-detail__appt-bring-item"
                            key={item}
                          >
                            <IconCheck size={12} aria-hidden />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="student-ticket-detail__section-label">
                    Related tickets
                  </div>
                  <div className="student-ticket-detail__related-panel">
                    {ticket.related.map((related) => {
                      const { icon: RelatedIcon, color: iconColor } =
                        getRelatedTicketIcon(related.icon);
                      return (
                        <button
                          key={related.ticketNumber}
                          type="button"
                          className="student-ticket-detail__related-ticket"
                          onClick={() =>
                            navigate(`/tickets/${related.ticketNumber}`)
                          }
                        >
                          <div className="student-ticket-detail__rt-icon">
                            <RelatedIcon
                              size={14}
                              color={iconColor}
                              aria-hidden
                            />
                          </div>
                          <div>
                            <div className="student-ticket-detail__rt-title">
                              {related.title}
                            </div>
                            <div className="student-ticket-detail__rt-sub">
                              {related.sub}
                            </div>
                          </div>
                          <IconChevronRight
                            size={14}
                            color="#d1d5db"
                            style={{ marginLeft: 'auto' }}
                            aria-hidden
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="student-ticket-detail__section-label">
                    Need more help?
                  </div>
                  <div className="student-ticket-detail__help-panel">
                    <div className="student-ticket-detail__help-title">
                      <IconMessageChatbot size={14} aria-hidden />
                      Ask the AI Helpdesk
                    </div>
                    <p className="student-ticket-detail__help-desc">
                      Have a question about this ticket or a new concern? The AI
                      can help you right away.
                    </p>
                    <button
                      type="button"
                      className="student-ticket-detail__help-btn"
                      onClick={() => navigate('/dashboard')}
                    >
                      Open AI Helpdesk
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
