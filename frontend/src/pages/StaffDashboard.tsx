import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconBook,
  IconBuildingCommunity,
  IconCalendarPlus,
  IconCheck,
  IconDownload,
  IconEyeOff,
  IconFilter,
  IconInbox,
  IconLogout,
  IconMessage,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconSend,
  IconSettings,
  IconTrendingDown,
} from '@tabler/icons-react';
import {
  addStaffTicketReply,
  getStaffDashboard,
  listStaffKbArticles,
  listStaffTickets,
  rescheduleStaffTicket,
  takeStaffTicket,
  updateStaffTicket,
  type StaffKbArticleSummary,
  type StaffQueueTicket,
  type StaffTodayAppointment,
} from '../api/client';
import { StaffNotifications } from '../components/StaffNotifications';
import { StaffRescheduleModal } from '../components/StaffRescheduleModal';
import { useShellScale } from '../hooks/useShellScale';
import { useStaffShell } from '../hooks/useStaffShell';
import { handleChatTextareaKeyDown } from '../utils/ticketDisplay';
import './StaffDashboard.css';

type FilterKey = 'all' | 'high' | 'sched' | 'progress' | 'resolved';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'sched', label: 'Scheduled' },
  { key: 'progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_BADGE: Record<StaffQueueTicket['status'], string> = {
  sched: 'staff-dashboard__b-sched',
  progress: 'staff-dashboard__b-progress',
  open: 'staff-dashboard__b-open',
  resolved: 'staff-dashboard__b-resolved',
};

const URGENCY_BADGE: Record<StaffQueueTicket['urgency'], string> = {
  low: 'staff-dashboard__b-low',
  med: 'staff-dashboard__b-med',
  high: 'staff-dashboard__b-high',
};

function matchesFilter(ticket: StaffQueueTicket, filter: FilterKey) {
  if (filter === 'all') return true;
  if (filter === 'high') return ticket.urgency === 'high';
  return ticket.status === filter;
}

function isTicketClosed(ticket: StaffQueueTicket) {
  return ticket.isClosed || ticket.status === 'resolved';
}

export function StaffDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { outerRef, shellRef } = useShellScale({ mobileBreakpoint: 1100 });
  const { staffUser, summary, navItems, handleLogout, refreshShell } =
    useStaffShell();

  const [tickets, setTickets] = useState<StaffQueueTicket[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<
    StaffTodayAppointment[]
  >([]);
  const [kbArticles, setKbArticles] = useState<StaffKbArticleSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [notes, setNotes] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hideResolved, setHideResolved] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);

  const loadTickets = useCallback(async (filter: FilterKey, includeResolved: boolean) => {
    setLoadingTickets(true);
    setLoadError(null);
    try {
      const status = filter === 'high' ? undefined : filter;
      const urgency = filter === 'high' ? 'high' : undefined;
      const [{ tickets: rows }, dashboard, kb] = await Promise.all([
        listStaffTickets({
          status,
          urgency,
          includeResolved: filter === 'resolved' ? undefined : includeResolved,
        }),
        getStaffDashboard(),
        listStaffKbArticles(),
      ]);
      setTickets(rows);
      setTodayAppointments(dashboard.todayAppointments);
      setKbArticles(kb.articles.slice(0, 3));
      setSelectedId((prev) => {
        if (prev && rows.some((t) => t.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
      await refreshShell();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  }, [refreshShell]);

  useEffect(() => {
    void loadTickets(activeFilter, !hideResolved);
  }, [activeFilter, hideResolved, loadTickets]);

  useEffect(() => {
    const ticketParam = searchParams.get('ticket');
    if (!ticketParam || tickets.length === 0) return;
    const normalized = ticketParam.startsWith('#') ? ticketParam : `#${ticketParam}`;
    if (tickets.some((ticket) => ticket.id === normalized)) {
      setSelectedId(normalized);
    }
  }, [searchParams, tickets]);

  const filteredTickets = useMemo(
    () => tickets.filter((t) => matchesFilter(t, activeFilter)),
    [tickets, activeFilter],
  );

  const selected = filteredTickets.find((t) => t.id === selectedId) ?? filteredTickets[0];

  useEffect(() => {
    if (selected) {
      setNotes(selected.staffNotes ?? '');
      setShowReply(false);
      setReplyText('');
    }
  }, [selected?.id, selected?.staffNotes]);

  useEffect(() => {
    if (!selected || isTicketClosed(selected)) return;

    function refreshConversation() {
      void loadTickets(activeFilter, !hideResolved);
    }

    const interval = window.setInterval(refreshConversation, 15000);
    window.addEventListener('focus', refreshConversation);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshConversation);
    };
  }, [selected?.id, activeFilter, hideResolved, loadTickets]);

  async function refreshAfterAction() {
    await loadTickets(activeFilter, !hideResolved);
  }

  async function handleTakeTicket() {
    if (!selected || actionBusy || isTicketClosed(selected)) return;
    setActionBusy(true);
    try {
      await takeStaffTicket(selected.ticketNumber);
      await refreshAfterAction();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to take ticket');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReply() {
    if (!selected || !replyText.trim() || actionBusy || isTicketClosed(selected)) return;
    setActionBusy(true);
    try {
      const { ticket } = await addStaffTicketReply(
        selected.ticketNumber,
        replyText.trim(),
      );
      setTickets((prev) =>
        prev.map((row) =>
          row.ticketNumber === selected.ticketNumber
            ? { ...row, replies: ticket.replies }
            : row,
        ),
      );
      setReplyText('');
      setShowReply(false);
      await refreshAfterAction();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleResolve() {
    if (!selected || actionBusy || isTicketClosed(selected)) return;
    setActionBusy(true);
    try {
      const { ticket } = await updateStaffTicket(selected.ticketNumber, {
        status: 'RESOLVED',
      });
      const updated = ticket.queue;
      if (updated) {
        setTickets((prev) => {
          if (hideResolved && activeFilter !== 'resolved') {
            return prev.filter((row) => row.id !== updated.id);
          }
          return prev.map((row) => (row.id === updated.id ? updated : row));
        });
        setSelectedId((prev) => {
          if (hideResolved && activeFilter !== 'resolved') {
            return prev === updated.id ? null : prev;
          }
          return updated.id;
        });
      }
      setShowReply(false);
      setShowReschedule(false);
      await refreshAfterAction();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReschedule(startsAt: string) {
    if (!selected || actionBusy || isTicketClosed(selected)) return;
    setActionBusy(true);
    try {
      await rescheduleStaffTicket(selected.ticketNumber, startsAt);
      setShowReschedule(false);
      await refreshAfterAction();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to reschedule');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveNotes() {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    try {
      await updateStaffTicket(selected.ticketNumber, { staffNotes: notes });
      await refreshAfterAction();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setActionBusy(false);
    }
  }

  const departmentLabel = staffUser?.department ?? 'Staff';
  const selectedClosed = selected ? isTicketClosed(selected) : false;
  const recentActivity = tickets.slice(0, 4).map((ticket) => ({
    dot: ticket.aiTriaged ? ('blue' as const) : ('amber' as const),
    text: `${ticket.id} — ${ticket.concern}`,
    time: ticket.time,
  }));

  return (
    <div className="staff-dashboard">
      <h2 className="staff-dashboard__sr-only">
        Campus360 personnel dashboard showing ticket queue, AI-generated ticket
        summary with student details and suggested next steps, department
        analytics, and knowledge base
      </h2>

      <div className="staff-dashboard__outer" ref={outerRef}>
        <div className="staff-dashboard__shell" ref={shellRef}>
          <aside className="staff-dashboard__sidebar">
            <div className="staff-dashboard__sb-logo">
              <div className="staff-dashboard__sb-logo-icon">
                <IconBuildingCommunity size={18} aria-hidden />
              </div>
              <span className="staff-dashboard__sb-logo-text">Campus360</span>
            </div>

            <div className="staff-dashboard__sb-staff-wrap">
              <div className="staff-dashboard__sb-staff">
                <div className="staff-dashboard__sb-avatar">
                  {staffUser?.initials ?? '—'}
                </div>
                <div>
                  <div className="staff-dashboard__sb-name">
                    {staffUser?.name ?? 'Loading…'}
                  </div>
                  <div className="staff-dashboard__sb-role">
                    {staffUser?.roleLabel ?? 'Staff'}
                  </div>
                </div>
              </div>
            </div>

            <div className="staff-dashboard__sb-dept">Department</div>
            <nav className="staff-dashboard__sb-nav">
              {navItems.map(
                ({ label, icon: Icon, path, active, badge, badgeAmber }) => (
                  <button
                    key={label}
                    type="button"
                    className={`staff-dashboard__nav-item${active ? ' active' : ''}`}
                    onClick={() => navigate(path)}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                    {badge !== undefined && badge > 0 && (
                      <span className="staff-dashboard__nav-badge">{badge}</span>
                    )}
                    {badgeAmber !== undefined && badgeAmber > 0 && (
                      <span className="staff-dashboard__nav-badge-amber">
                        {badgeAmber}
                      </span>
                    )}
                  </button>
                ),
              )}
            </nav>

            <div className="staff-dashboard__sb-dept staff-dashboard__sb-dept.system">
              System
            </div>
            <div className="staff-dashboard__sb-system">
              <button type="button" className="staff-dashboard__nav-item">
                <IconSettings size={16} aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="staff-dashboard__nav-item"
                onClick={() => void handleLogout()}
              >
                <IconLogout size={16} aria-hidden />
                Logout
              </button>
            </div>
            <div className="staff-dashboard__sb-spacer" />
          </aside>

          <div className="staff-dashboard__main">
            <header className="staff-dashboard__topbar">
              <div className="staff-dashboard__topbar-title">
                {departmentLabel} — Dashboard
              </div>
              <div className="staff-dashboard__topbar-right">
                <button type="button" className="staff-dashboard__tb-btn">
                  <IconFilter size={14} aria-hidden />
                  Filter
                </button>
                <button type="button" className="staff-dashboard__tb-btn">
                  <IconDownload size={14} aria-hidden />
                  Export
                </button>
                <button
                  type="button"
                  className="staff-dashboard__tb-btn staff-dashboard__tb-btn-primary"
                >
                  <IconPlus size={14} aria-hidden />
                  New ticket
                </button>
                <StaffNotifications />
              </div>
            </header>

            {showReschedule && selected && staffUser?.department && (
              <StaffRescheduleModal
                department={staffUser.department}
                ticketLabel={`${selected.id} · ${selected.concern}`}
                excludeAppointmentId={selected.appointmentId}
                busy={actionBusy}
                onClose={() => setShowReschedule(false)}
                onConfirm={(startsAt) => void handleReschedule(startsAt)}
              />
            )}

            {loadError && (
              <div className="staff-dashboard__content" style={{ padding: 16 }}>
                {loadError}
              </div>
            )}

            <div className="staff-dashboard__content">
              <div className="staff-dashboard__queue-col">
                <div className="staff-dashboard__queue-header">
                  <div className="staff-dashboard__queue-title">
                    <IconInbox size={15} color="#1B4080" aria-hidden />
                    Open tickets
                    <span className="staff-dashboard__queue-count">
                      {summary?.queueCount ?? filteredTickets.length}
                    </span>
                  </div>
                  <div className="staff-dashboard__queue-actions">
                    <button
                      type="button"
                      className="staff-dashboard__queue-refresh"
                      onClick={() => void loadTickets(activeFilter, !hideResolved)}
                      disabled={loadingTickets}
                      aria-label="Refresh tickets"
                    >
                      <IconRefresh size={14} aria-hidden />
                    </button>
                    <span className="staff-dashboard__queue-sort">Sort: Newest</span>
                  </div>
                </div>

                <div className="staff-dashboard__filter-row">
                  {FILTERS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`staff-dashboard__filter-chip${activeFilter === key ? ' active' : ''}`}
                      onClick={() => setActiveFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                  {activeFilter !== 'resolved' && (
                    <button
                      type="button"
                      className={`staff-dashboard__filter-chip${hideResolved ? ' active' : ''}`}
                      onClick={() => setHideResolved((value) => !value)}
                    >
                      <IconEyeOff size={12} aria-hidden />
                      {hideResolved ? 'Hiding resolved' : 'Showing resolved'}
                    </button>
                  )}
                </div>

                <div className="staff-dashboard__ticket-list">
                  {loadingTickets && (
                    <div style={{ padding: 16, color: '#64748b' }}>
                      Loading tickets…
                    </div>
                  )}
                  {!loadingTickets && filteredTickets.length === 0 && (
                    <div style={{ padding: 16, color: '#64748b' }}>
                      No tickets in this queue.
                    </div>
                  )}
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      className={`staff-dashboard__ticket-item${selected?.id === ticket.id ? ' selected' : ''}`}
                      onClick={() => {
                        setSelectedId(ticket.id);
                      }}
                    >
                      <div className="staff-dashboard__ti-row1">
                        <span className="staff-dashboard__ti-id">{ticket.id}</span>
                        <span className="staff-dashboard__ti-time">{ticket.time}</span>
                      </div>
                      <div className="staff-dashboard__ti-concern">{ticket.concern}</div>
                      <div className="staff-dashboard__ti-student">
                        {ticket.studentName} · {ticket.studentEmail}
                      </div>
                      <div className="staff-dashboard__ti-tags">
                        <span
                          className={`staff-dashboard__badge ${STATUS_BADGE[ticket.status]}`}
                        >
                          {ticket.statusLabel}
                        </span>
                        <span
                          className={`staff-dashboard__badge ${URGENCY_BADGE[ticket.urgency]}`}
                        >
                          {ticket.urgencyLabel}
                        </span>
                        {ticket.aiTriaged && (
                          <span className="staff-dashboard__badge staff-dashboard__b-ai">
                            AI-triaged
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="staff-dashboard__center-col">
                {!selected ? (
                  <div className="staff-dashboard__ticket-detail" style={{ padding: 24 }}>
                    Select a ticket from the queue.
                  </div>
                ) : (
                  <div className="staff-dashboard__ticket-detail">
                    <div className="staff-dashboard__detail-header">
                      <div>
                        <div className="staff-dashboard__detail-title">
                          {selected.concern}
                        </div>
                        <div className="staff-dashboard__detail-meta">
                          <span className="staff-dashboard__detail-id">
                            {selected.id}
                          </span>
                          <span>·</span>
                          <span>{selected.submittedAt}</span>
                          {selected.scheduledLabel && (
                            <>
                              <span>·</span>
                              <span
                                className={`staff-dashboard__badge ${STATUS_BADGE[selected.status]}`}
                                style={{ fontSize: 11 }}
                              >
                                {selected.scheduledLabel}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="staff-dashboard__detail-actions">
                        {selectedClosed ? (
                          <span className="staff-dashboard__badge staff-dashboard__b-resolved">
                            Closed
                          </span>
                        ) : (
                          <>
                            {!selected.isTaken ? (
                              <button
                                type="button"
                                className="staff-dashboard__action-btn staff-dashboard__action-btn-success"
                                disabled={actionBusy}
                                onClick={() => void handleTakeTicket()}
                              >
                                Take ticket
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="staff-dashboard__action-btn"
                                disabled={actionBusy}
                                onClick={() => setShowReply((v) => !v)}
                              >
                                <IconSend size={13} aria-hidden />
                                Reply
                              </button>
                            )}
                            <button
                              type="button"
                              className="staff-dashboard__action-btn"
                              disabled={actionBusy}
                              onClick={() => setShowReschedule(true)}
                            >
                              <IconCalendarPlus size={13} aria-hidden />
                              Reschedule
                            </button>
                            <button
                              type="button"
                              className="staff-dashboard__action-btn staff-dashboard__action-btn-success"
                              disabled={actionBusy}
                              onClick={() => void handleResolve()}
                            >
                              <IconCheck size={13} aria-hidden />
                              Mark resolved
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="staff-dashboard__conversation-card">
                      <div className="staff-dashboard__conversation-header">
                        <IconMessage size={15} color="#2E5BA8" aria-hidden />
                        Conversation
                      </div>
                      {(selected.replies ?? []).length > 0 ? (
                        <div className="staff-dashboard__reply-thread">
                          {(selected.replies ?? []).map((item) => (
                            <div
                              key={item.id}
                              className={`staff-dashboard__reply-message${
                                item.isStudent ? ' student' : ''
                              }`}
                            >
                              <div className="staff-dashboard__reply-meta">
                                <strong>{item.authorName}</strong>
                                <span>{item.timeLabel}</span>
                              </div>
                              <p>{item.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="staff-dashboard__reply-empty">
                          {selected.isTaken
                            ? 'No messages yet. Send a reply to start the conversation.'
                            : 'Take this ticket to start messaging the student.'}
                        </p>
                      )}
                      {showReply && selected.isTaken && !selectedClosed && (
                        <div className="staff-dashboard__reply-compose">
                          <textarea
                            className="staff-dashboard__notes-area"
                            rows={3}
                            placeholder="Write a reply to the student… (Shift+Enter for new line)"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(event) =>
                              handleChatTextareaKeyDown(event, () => {
                                void handleReply();
                              })
                            }
                          />
                          <button
                            type="button"
                            className="staff-dashboard__action-btn staff-dashboard__action-btn-success"
                            disabled={actionBusy || !replyText.trim()}
                            onClick={() => void handleReply()}
                          >
                            Send reply
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="staff-dashboard__ai-summary-card">
                      <div className="staff-dashboard__ai-summary-header">
                        <IconRobot size={15} color="#7C3AED" aria-hidden />
                        <span className="staff-dashboard__ai-summary-label">
                          AI-generated summary
                        </span>
                      </div>
                      <div className="staff-dashboard__ai-summary-body">
                        {selected.aiSummary}
                      </div>
                    </div>

                    <div className="staff-dashboard__student-card">
                      <div className="staff-dashboard__stu-avatar">
                        {selected.student.initials}
                      </div>
                      <div className="staff-dashboard__stu-info">
                        <div className="staff-dashboard__stu-name">
                          {selected.studentName}
                        </div>
                        <div className="staff-dashboard__stu-sub">
                          {selected.studentEmail} · {selected.student.program}
                        </div>
                        <div className="staff-dashboard__stu-tags">
                          {selected.student.tags.map((tag) => (
                            <span
                              key={tag.label}
                              className="staff-dashboard__badge"
                              style={{ background: tag.bg, color: tag.color }}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="staff-dashboard__stu-stat">
                        <div className="staff-dashboard__stu-stat-label">
                          Tickets this sem.
                        </div>
                        <div className="staff-dashboard__stu-stat-num">
                          {selected.student.ticketsThisSem}
                        </div>
                      </div>
                    </div>

                    <div className="staff-dashboard__info-grid">
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">Purpose</div>
                        <div className="staff-dashboard__info-value-sm">
                          {selected.info.purpose}
                        </div>
                      </div>
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">Deadline</div>
                        <div
                          className={`staff-dashboard__info-value${selected.info.deadlineWarn ? ' staff-dashboard__info-value-warn' : ''}`}
                        >
                          {selected.info.deadline}
                        </div>
                      </div>
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">
                          Appointment slot
                        </div>
                        <div className="staff-dashboard__info-value-sm">
                          {selected.info.appointment}
                        </div>
                      </div>
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">Assigned to</div>
                        <div className="staff-dashboard__info-value-sm">
                          {selected.info.assignedTo}
                        </div>
                      </div>
                    </div>

                    <div className="staff-dashboard__section-sep">
                      AI-suggested next steps
                    </div>
                    <div className="staff-dashboard__suggested-steps">
                      {selected.steps.map((step, index) => (
                        <div className="staff-dashboard__step-row" key={index}>
                          <div className="staff-dashboard__step-num">{index + 1}</div>
                          <div className="staff-dashboard__step-text">
                            {step.text}
                            {step.tag && (
                              <span className="staff-dashboard__step-tag">
                                {step.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="staff-dashboard__section-sep">Staff notes</div>
                    <textarea
                      className="staff-dashboard__notes-area"
                      rows={3}
                      placeholder={`Add internal notes — visible only to ${departmentLabel} staff…`}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={selectedClosed}
                    />
                    {!selectedClosed && (
                      <button
                        type="button"
                        className="staff-dashboard__action-btn"
                        style={{ marginTop: 8 }}
                        disabled={actionBusy}
                        onClick={() => void handleSaveNotes()}
                      >
                        Save notes
                      </button>
                    )}
                  </div>
                )}
              </div>

              <aside className="staff-dashboard__right-col">
                <div>
                  <div className="staff-dashboard__right-section-label">
                    Today&apos;s overview
                  </div>
                  <div className="staff-dashboard__stat-grid">
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num">
                        {summary?.queueCount ?? 0}
                      </div>
                      <div className="staff-dashboard__stat-label">Open tickets</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num amber">
                        {summary?.openCount ?? 0}
                      </div>
                      <div className="staff-dashboard__stat-label">Action needed</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num green">
                        {summary?.resolvedCount ?? 0}
                      </div>
                      <div className="staff-dashboard__stat-label">Resolved</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num blue">
                        {summary?.todayAppointmentCount ?? 0}
                      </div>
                      <div className="staff-dashboard__stat-label">Appointments</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="staff-dashboard__right-section-label">
                    Avg. resolution time
                  </div>
                  <div className="staff-dashboard__resolution-panel">
                    <div className="staff-dashboard__resolution-value">—</div>
                    <div className="staff-dashboard__resolution-trend">
                      <IconTrendingDown size={13} aria-hidden />
                      Analytics coming soon
                    </div>
                    <div className="staff-dashboard__resolution-track">
                      <div className="staff-dashboard__resolution-fill" />
                    </div>
                    <div className="staff-dashboard__resolution-target">
                      Target: ≤ 2 days
                    </div>
                  </div>
                </div>

                <div>
                  <div className="staff-dashboard__right-section-label">
                    Today&apos;s appointments
                  </div>
                  <div className="staff-dashboard__appt-list">
                    {todayAppointments.length === 0 && (
                      <div className="staff-dashboard__appt-item">
                        <div className="staff-dashboard__appt-detail">
                          No appointments today.
                        </div>
                      </div>
                    )}
                    {todayAppointments.map((appt) => (
                      <div className="staff-dashboard__appt-item" key={appt.id}>
                        <div className="staff-dashboard__appt-name">
                          {appt.studentName}
                        </div>
                        <div className="staff-dashboard__appt-detail">
                          {appt.title} · {appt.time}
                          {appt.location ? ` · ${appt.location}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="staff-dashboard__right-section-label">
                    Knowledge base
                  </div>
                  <div className="staff-dashboard__kb-panel">
                    {kbArticles.length === 0 && (
                      <div className="staff-dashboard__kb-item">
                        <div className="staff-dashboard__kb-text">
                          No articles for your department yet.
                        </div>
                      </div>
                    )}
                    {kbArticles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        className="staff-dashboard__kb-item"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate('/staff/knowledge-base')}
                      >
                        <div className="staff-dashboard__kb-icon">
                          <IconBook size={14} color="#2563eb" aria-hidden />
                        </div>
                        <div>
                          <div className="staff-dashboard__kb-text">{article.title}</div>
                          <div className="staff-dashboard__kb-tag">
                            {article.readTime}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="staff-dashboard__right-section-label">
                    Recent activity
                  </div>
                  <div className="staff-dashboard__activity-panel">
                    {recentActivity.length === 0 && (
                      <div className="staff-dashboard__activity-item">
                        <div className="staff-dashboard__act-text">
                          No recent ticket activity.
                        </div>
                      </div>
                    )}
                    {recentActivity.map((item) => (
                      <div className="staff-dashboard__activity-item" key={item.text}>
                        <div
                          className={`staff-dashboard__act-dot staff-dashboard__act-dot-${item.dot}`}
                        />
                        <div>
                          <div className="staff-dashboard__act-text">{item.text}</div>
                          <div className="staff-dashboard__act-time">{item.time}</div>
                        </div>
                      </div>
                    ))}
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
