import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconLogout,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconTicket,
  IconTrash,
} from '@tabler/icons-react';
import {
  deleteTicket,
  getMe,
  listTickets,
  logout,
  type TicketSummary,
  type User,
} from '../api/client';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { getStudentNavItems } from '../config/studentNav';
import { useShellScale } from '../hooks/useShellScale';
import {
  TICKET_BADGE_CLASS,
  TICKET_URGENCY_CLASS,
} from '../utils/ticketDisplay';
import './StudentDashboard.css';
import './StudentTicketDetail.css';
import './StudentTickets.css';

type StatusFilter = 'all' | 'open' | 'resolved';

const OPEN_STATUSES: TicketSummary['status'][] = ['open', 'progress', 'pending'];

export function StudentTickets() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const navItems = getStudentNavItems(location.pathname);

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
    navigate('/dashboard', { state: { focusHelpdesk: true } });
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

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Still return to login if logout fails.
    }
    navigate('/login');
  }

  if (!user && loading) {
    return null;
  }

  return (
    <div className="student-ticket-detail student-tickets">
      <h2 className="student-ticket-detail__sr-only">
        Campus360 my tickets page listing all support tickets with status filters
      </h2>

      <div className="student-ticket-detail__outer" ref={outerRef}>
        <div className="student-ticket-detail__shell" ref={shellRef}>
          <aside className="student-ticket-detail__sidebar">
            <div className="student-ticket-detail__sb-logo">
              <div className="student-ticket-detail__sb-logo-icon">
                <IconBuildingCommunity size={20} aria-hidden />
              </div>
              <span className="student-ticket-detail__sb-logo-text">
                Campus360
              </span>
            </div>

            <nav className="student-ticket-detail__sb-nav">
              {navItems.map(({ label, icon: Icon, path, active, badge }) => (
                <button
                  key={label}
                  type="button"
                  className={`student-ticket-detail__nav-item${active ? ' active' : ''}`}
                  onClick={() => navigate(path)}
                >
                  <Icon size={17} aria-hidden />
                  {label}
                  {badge !== undefined && (
                    <span className="student-ticket-detail__nav-badge">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="student-ticket-detail__sb-footer">
              <button
                type="button"
                className="student-ticket-detail__nav-item"
                onClick={() => navigate('/settings')}
              >
                <IconSettings size={17} aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="student-ticket-detail__nav-item"
                onClick={handleLogout}
              >
                <IconLogout size={17} aria-hidden />
                Logout
              </button>
            </div>
          </aside>

          <div className="student-ticket-detail__main">
            <header className="student-ticket-detail__topbar">
              <div className="student-tickets__topbar-title">
                <IconTicket size={18} color="#2E5BA8" aria-hidden />
                My Tickets
              </div>
              {user && <StudentTopbar user={user} onUserUpdated={setUser} />}
            </header>

            <div className="student-tickets__content">
              <div className="student-tickets__summary-row">
                <div className="student-tickets__summary-card">
                  <span className="student-tickets__summary-label">Total</span>
                  <strong>{tickets.length}</strong>
                </div>
                <div className="student-tickets__summary-card">
                  <span className="student-tickets__summary-label">Open</span>
                  <strong>{openCount}</strong>
                </div>
                <div className="student-tickets__summary-card">
                  <span className="student-tickets__summary-label">Resolved</span>
                  <strong>
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

              <div className="student-dashboard__card student-tickets__table-card">
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
                      <tr>
                        <td colSpan={8}>Loading tickets…</td>
                      </tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={8}>No tickets match this filter.</td>
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
                          <td className="student-dashboard__ticket-id">
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
                            <span className={TICKET_URGENCY_CLASS[ticket.urgency]}>
                              {ticket.urgencyLabel}
                            </span>
                          </td>
                          <td>{ticket.department}</td>
                          <td className="student-dashboard__ticket-date">
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
                          <td className="student-dashboard__ticket-date">
                            {ticket.lastUpdate}
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
