import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconPlus,
  IconRefresh,
  IconTicket,
  IconTrash,
} from '@tabler/icons-react';
import {
  deleteTicket,
  getMe,
  listTickets,
  type TicketSummary,
  type User,
} from '../api/client';
import { StudentSidebar } from '../components/StudentSidebar';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { usePageTitle } from '../hooks/usePageTitle';
import { useShellScale } from '../hooks/useShellScale';
import {
  TICKET_BADGE_CLASS,
  TICKET_URGENCY_CLASS,
} from '../utils/ticketDisplay';
import { formatRelativeTime } from '../utils/relativeTime';
import './StudentDashboard.css';
import './StudentTickets.css';

type StatusFilter = 'all' | 'open' | 'resolved';

const OPEN_STATUSES: TicketSummary['status'][] = ['open', 'progress', 'pending'];

export function StudentTickets() {
  const navigate = useNavigate();
  usePageTitle('My Tickets');
  const { outerRef, shellRef } = useShellScale();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [helpdeskPromptOpen, setHelpdeskPromptOpen] = useState(false);
  const [deletingTicketNumber, setDeletingTicketNumber] = useState<string | null>(
    null,
  );

  async function loadTickets(silent = false) {
    if (!silent) {
      setRefreshing(true);
    }
    try {
      const [me, ticketData] = await Promise.all([getMe(), listTickets()]);
      setUser(me.user);
      setTickets(ticketData.tickets);
    } catch {
      if (!silent) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
      if (!silent) {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [navigate]);

  useEffect(() => {
    function handleFocus() {
      void loadTickets(true);
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadTickets(true);
      }
    }, 20000);

    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [navigate]);

  const filteredTickets = useMemo(() => {
    if (filter === 'open') {
      return tickets.filter((ticket) => OPEN_STATUSES.includes(ticket.status));
    }
    if (filter === 'resolved') {
      return tickets.filter((ticket) => ticket.status === 'resolved');
    }
    return tickets;
  }, [filter, tickets]);

  const openCount = tickets.filter((ticket) =>
    OPEN_STATUSES.includes(ticket.status),
  ).length;

  function goToHelpdesk() {
    setHelpdeskPromptOpen(false);
    navigate('/dashboard');
  }

  async function handleDeleteTicket(
    event: React.MouseEvent,
    ticket: TicketSummary,
  ) {
    event.stopPropagation();
    if (ticket.status !== 'resolved' || deletingTicketNumber) return;

    const confirmed = window.confirm(
      `Remove ticket ${ticket.id} from your history? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingTicketNumber(ticket.ticketNumber);
    try {
      await deleteTicket(ticket.ticketNumber);
      setTickets((current) =>
        current.filter((item) => item.ticketNumber !== ticket.ticketNumber),
      );
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Failed to delete ticket',
      );
    } finally {
      setDeletingTicketNumber(null);
    }
  }

  if (!user && loading) {
    return null;
  }

  return (
    <div className="student-dashboard student-tickets">
      <h2 className="student-dashboard__sr-only">
        Campus360 my tickets page listing all support tickets with status filters
      </h2>

      <div className="student-dashboard__outer" ref={outerRef}>
        <div className="student-dashboard__shell" ref={shellRef}>
          <StudentSidebar />

          <div className="student-dashboard__main">
            <header className="student-dashboard__topbar">
              <div className="student-tickets__topbar-title">
                <IconTicket size={18} color="#2E5BA8" aria-hidden />
                My Tickets
              </div>
              {user && <StudentTopbar user={user} onUserUpdated={setUser} />}
            </header>

            <div className="student-tickets__content">
              <div className="student-tickets__summary-row">
                <div className="student-tickets__summary-card c360-stagger" style={{ '--c360-stagger': 0 } as CSSProperties}>
                  <span className="student-tickets__summary-label">Total</span>
                  <strong className="c360-tabular">{tickets.length}</strong>
                </div>
                <div className="student-tickets__summary-card c360-stagger" style={{ '--c360-stagger': 1 } as CSSProperties}>
                  <span className="student-tickets__summary-label">Open</span>
                  <strong className="c360-tabular">{openCount}</strong>
                </div>
                <div className="student-tickets__summary-card c360-stagger" style={{ '--c360-stagger': 2 } as CSSProperties}>
                  <span className="student-tickets__summary-label">Resolved</span>
                  <strong className="c360-tabular">
                    {tickets.filter((ticket) => ticket.status === 'resolved').length}
                  </strong>
                </div>
              </div>

              <div className="student-tickets__toolbar">
                <div className="student-tickets__filters">
                  {(['all', 'open', 'resolved'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`student-tickets__filter-btn${
                        filter === value ? ' active' : ''
                      }`}
                      onClick={() => setFilter(value)}
                    >
                      {value === 'all'
                        ? 'All'
                        : value === 'open'
                          ? 'Open'
                          : 'Resolved'}
                    </button>
                  ))}
                </div>
                <div className="student-tickets__toolbar-actions">
                  <span className="student-tickets__result-count">
                    {filteredTickets.length} ticket
                    {filteredTickets.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    className="student-dashboard__refresh-btn"
                    onClick={() => void loadTickets()}
                    disabled={refreshing}
                    aria-label="Refresh tickets"
                  >
                    <IconRefresh
                      size={14}
                      className={refreshing ? 'spinning' : undefined}
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    className="student-tickets__create-btn"
                    onClick={() => setHelpdeskPromptOpen(true)}
                  >
                    <IconPlus size={14} aria-hidden />
                    New ticket
                  </button>
                </div>
              </div>

              <div className="student-dashboard__card student-tickets__table-card c360-stagger" style={{ '--c360-stagger': 3 } as CSSProperties}>
                <table className="student-dashboard__tickets-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Concern</th>
                      <th>Status</th>
                      <th>Urgency</th>
                      <th>Department</th>
                      <th>Scheduled</th>
                      <th>Last Update</th>
                      <th className="student-tickets__action-col" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={8}>
                            <Skeleton height={16} />
                          </td>
                        </tr>
                      ))
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <EmptyState
                            title={
                              filter === 'all'
                                ? 'No tickets yet'
                                : `No ${filter} tickets`
                            }
                            description={
                              filter === 'all'
                                ? 'Ask the AI helpdesk to open your first ticket.'
                                : 'Try a different filter or start a new request.'
                            }
                            action={
                              filter === 'all' ? (
                                <button
                                  type="button"
                                  className="student-tickets__create-btn"
                                  onClick={goToHelpdesk}
                                >
                                  Ask the AI helpdesk
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="student-tickets__create-btn"
                                  onClick={() => setHelpdeskPromptOpen(true)}
                                >
                                  New ticket
                                </button>
                              )
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="student-dashboard__ticket-row student-tickets__ticket-row"
                          onClick={() =>
                            navigate(`/tickets/${ticket.ticketNumber}`)
                          }
                        >
                          <td className="student-dashboard__ticket-id c360-tabular">
                            {ticket.id}
                          </td>
                          <td>{ticket.concern}</td>
                          <td>
                            <span
                              className={`student-dashboard__badge ${TICKET_BADGE_CLASS[ticket.status]}`}
                            >
                              {ticket.statusLabel}
                            </span>
                          </td>
                          <td>
                            <span className="student-dashboard__urgency-cell">
                              <span
                                className={`student-dashboard__urgency-dot student-dashboard__urgency-dot--${ticket.urgency}`}
                                aria-hidden
                              />
                              <span className={TICKET_URGENCY_CLASS[ticket.urgency]}>
                                {ticket.urgencyLabel}
                              </span>
                            </span>
                          </td>
                          <td>{ticket.department}</td>
                          <td className="student-dashboard__ticket-date c360-tabular">
                            {ticket.scheduledDate
                              ? new Date(ticket.scheduledDate).toLocaleDateString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  },
                                )
                              : '—'}
                          </td>
                          <td className="student-dashboard__ticket-date c360-tabular">
                            {formatRelativeTime(ticket.updatedAt)}
                          </td>
                          <td className="student-tickets__action-col">
                            {ticket.status === 'resolved' && (
                              <button
                                type="button"
                                className="student-tickets__delete-btn"
                                aria-label={`Delete ticket ${ticket.id}`}
                                disabled={
                                  deletingTicketNumber === ticket.ticketNumber
                                }
                                onClick={(event) =>
                                  handleDeleteTicket(event, ticket)
                                }
                              >
                                <IconTrash size={16} aria-hidden />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {helpdeskPromptOpen && (
        <div
          className="student-tickets__modal-overlay"
          onClick={() => setHelpdeskPromptOpen(false)}
        >
          <div
            className="student-tickets__modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create ticket via AI helpdesk"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Start with the AI Helpdesk</h3>
            <p className="student-tickets__helpdesk-copy">
              Tickets are created through the AI helpdesk so we can route your
              request to the right department. Tell the assistant what you need
              and it will open a ticket for your account.
            </p>
            <div className="student-tickets__modal-actions">
              <button
                type="button"
                className="student-tickets__modal-btn"
                onClick={() => setHelpdeskPromptOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="student-tickets__create-btn"
                onClick={goToHelpdesk}
              >
                Go to AI Helpdesk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
