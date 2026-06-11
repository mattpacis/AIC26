import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconClock,
  IconMessageChatbot,
  IconRefresh,
  IconTicket,
} from '@tabler/icons-react';
import {
  getMe,
  getUserSettings,
  listAppointments,
  listTickets,
  type AppointmentRecord,
  type TicketSummary,
  type User,
} from '../api/client';
import { CopilotWebChat } from '../components/CopilotWebChat';
import '../components/CopilotWebChat.css';
import { StudentSidebar } from '../components/StudentSidebar';
import { OnboardingTour } from '../components/OnboardingTour';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { getTodayParts } from '../config/demoDate';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatRelativeTime } from '../utils/relativeTime';
import { openCampusPortal, QUICK_LINKS } from '../config/quickLinks';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { useShellScale } from '../hooks/useShellScale';
import { randomGreeting } from '../utils/greeting';
import {
  TICKET_BADGE_CLASS,
  TICKET_URGENCY_CLASS,
} from '../utils/ticketDisplay';
import './StudentDashboard.css';

type CalendarDay = {
  day: number;
  month: number;
  year: number;
  otherMonth: boolean;
};

type SidebarAppointment = {
  year: number;
  month: number;
  day: number;
  title: string;
  time: string;
  note?: string;
  variant: 'health' | 'registrar' | 'counseling';
  ticketNumber?: string;
  appointmentId?: string;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function buildCalendarGrid(viewYear: number, viewMonth: number): CalendarDay[] {
  const cells: CalendarDay[] = [];
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();

  for (let i = 0; i < startOffset; i++) {
    const date = new Date(viewYear, viewMonth, i - startOffset + 1);
    cells.push({
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      otherMonth: true,
    });
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, month: viewMonth, year: viewYear, otherMonth: false });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const date = new Date(last.year, last.month, last.day + 1);
    cells.push({
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      otherMonth: true,
    });
  }

  return cells;
}

function sameCalendarDay(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function dayKey(day: { year: number; month: number; day: number }) {
  return `${day.year}-${day.month}-${day.day}`;
}

function formatSelectedDayLabel(day: CalendarDay) {
  return new Date(day.year, day.month, day.day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function matchesScheduledDate(isoDate: string | null, day: CalendarDay) {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  return sameCalendarDay(
    { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() },
    day,
  );
}

function departmentVariant(department: string): SidebarAppointment['variant'] {
  const lower = department.toLowerCase();
  if (lower.includes('health')) return 'health';
  if (lower.includes('guidance') || lower.includes('counsel') || lower.includes('student services')) {
    return 'counseling';
  }
  return 'registrar';
}

function toSidebarAppointment(appt: AppointmentRecord): SidebarAppointment {
  const date = new Date(appt.scheduledAt);
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    title: appt.title,
    time: appt.time,
    note: appt.location ? `${appt.location} · ${appt.department}` : appt.department,
    variant: departmentVariant(appt.department),
    ticketNumber: appt.ticketNumber ?? undefined,
    appointmentId: appt.id,
  };
}

export function StudentDashboard() {
  const navigate = useNavigate();
  usePageTitle('Dashboard');
  const { outerRef, shellRef } = useShellScale();

  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshingTickets, setRefreshingTickets] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => {
    const today = getTodayParts();
    return { year: today.year, month: today.month };
  });
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  async function refreshTickets(silent = false) {
    if (!silent) {
      setRefreshingTickets(true);
    }
    try {
      const ticketData = await listTickets();
      setTickets(ticketData.tickets);
    } catch {
      if (!silent) {
        navigate('/login');
      }
    } finally {
      if (!silent) {
        setRefreshingTickets(false);
      }
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const [me, ticketData, settingsData] = await Promise.all([
          getMe(),
          listTickets(),
          getUserSettings(),
        ]);
        if (cancelled) return;
        setUser(me.user);
        setGreeting(randomGreeting(me.user.name.split(' ')[0]));
        setTickets(ticketData.tickets);
        setShowOnboarding(!settingsData.settings.onboardingComplete);
      } catch {
        if (!cancelled) {
          navigate('/login');
        }
      } finally {
        if (!cancelled) {
          setLoadingTickets(false);
        }
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    function handleFocus() {
      void refreshTickets(true);
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshTickets(true);
      }
    }, 20000);

    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadAppointments() {
      setLoadingAppointments(true);
      try {
        const { appointments: monthData } = await listAppointments({
          status: 'all',
          year: viewMonth.year,
          month: viewMonth.month,
        });
        if (!cancelled) {
          setAppointments(monthData);
        }
      } catch {
        if (!cancelled) {
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAppointments(false);
        }
      }
    }

    void loadAppointments();
    return () => {
      cancelled = true;
    };
  }, [user, viewMonth.year, viewMonth.month]);

  function goToDashboard() {
    navigate('/dashboard');
  }

  const copilotUser = useMemo(
    () =>
      user
        ? { id: user.id, email: user.email, name: user.name }
        : undefined,
    [user?.id, user?.email, user?.name],
  );

  const nextAppointment = useMemo(() => {
    const upcoming = appointments
      .filter((appt) => appt.status === 'upcoming')
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
    return upcoming[0] ?? null;
  }, [appointments]);

  if (!user) {
    return null;
  }

  const today = getTodayParts();
  const activeTickets = tickets.filter((ticket) => ticket.status !== 'resolved');
  const resolvedTickets = tickets.filter((ticket) => ticket.status === 'resolved').length;
  const resolutionRate =
    tickets.length === 0 ? 0 : Math.round((resolvedTickets / tickets.length) * 100);

  const calendarDays = buildCalendarGrid(viewMonth.year, viewMonth.month);
  const eventDayKeys = new Set<string>();

  for (const ticket of activeTickets) {
    if (ticket.scheduledDate) {
      const date = new Date(ticket.scheduledDate);
      eventDayKeys.add(
        dayKey({
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
        }),
      );
    }
  }

  for (const appointment of appointments) {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      continue;
    }
    const date = new Date(appointment.scheduledAt);
    eventDayKeys.add(
      dayKey({
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      }),
    );
  }

  const filteredTickets = selectedDay
    ? activeTickets.filter((ticket) =>
        matchesScheduledDate(ticket.scheduledDate, selectedDay),
      )
    : activeTickets;

  const linkedTicketNumbers = new Set(
    appointments
      .map((appt) => appt.ticketNumber)
      .filter((value): value is string => Boolean(value)),
  );

  const ticketAppointments: SidebarAppointment[] = activeTickets
    .filter(
      (ticket) => ticket.scheduledDate && !linkedTicketNumbers.has(ticket.ticketNumber),
    )
    .map((ticket) => {
      const date = new Date(ticket.scheduledDate!);
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        title: ticket.concern,
        time: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        note: `${ticket.department} · ${ticket.statusLabel}`,
        variant: departmentVariant(ticket.department),
        ticketNumber: ticket.ticketNumber,
      } satisfies SidebarAppointment;
    });

  const apiAppointments = appointments
    .filter((appt) => appt.status === 'upcoming')
    .map(toSidebarAppointment);

  const allAppointments = [...ticketAppointments, ...apiAppointments].sort(
    (a, b) =>
      new Date(a.year, a.month, a.day).getTime() -
      new Date(b.year, b.month, b.day).getTime(),
  );

  const filteredAppointments = selectedDay
    ? allAppointments.filter((item) => sameCalendarDay(item, selectedDay))
    : allAppointments.filter(
        (item) => item.month === viewMonth.month && item.year === viewMonth.year,
      );

  function handleDayClick(cell: CalendarDay) {
    setSelectedDay((current) =>
      current && sameCalendarDay(current, cell) ? null : cell,
    );
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewMonth.year, viewMonth.month + delta, 1);
    setViewMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDay(null);
  }

  return (
    <div className="student-dashboard">
      <OnboardingTour open={showOnboarding} onComplete={() => setShowOnboarding(false)} />
      <h2 className="student-dashboard__sr-only">
        Campus360 student dashboard with AI helpdesk chat, current tickets,
        appointment calendar, and quick links to campus services
      </h2>

      <div className="student-dashboard__outer" ref={outerRef}>
        <div className="student-dashboard__shell" ref={shellRef}>
          <StudentSidebar />

          <div className="student-dashboard__main">
            <header className="student-dashboard__topbar">
              <div className="student-dashboard__topbar-left">
                <span className="student-dashboard__greeting">{greeting}</span>
                {nextAppointment && (
                  <div className="student-dashboard__greeting-sub">
                    <span className="student-dashboard__greeting-sub-label">
                      Next appointment
                    </span>
                    <span className="student-dashboard__greeting-sub-detail">
                      {nextAppointment.title} · {nextAppointment.time}
                      {nextAppointment.location ? ` · ${nextAppointment.location}` : ''}
                    </span>
                  </div>
                )}
              </div>
              <StudentTopbar user={user} onUserUpdated={setUser} />
            </header>

            <div className="student-dashboard__content-area">
              <div className="student-dashboard__center-col">
                <div className="student-dashboard__center-top">
                <div className="student-dashboard__card student-dashboard__chat-card student-dashboard__card--focus c360-stagger" style={{ '--c360-stagger': 0 } as CSSProperties}>
                  <div className="student-dashboard__chat-header">
                    <div className="student-dashboard__chat-title">
                      <IconMessageChatbot size={18} color="#2E5BA8" aria-hidden />
                      AI Helpdesk
                      <span className="student-dashboard__ai-badge">
                        <span className="student-dashboard__ai-badge-dot" aria-hidden />
                        Copilot
                      </span>
                    </div>
                    <div className="student-dashboard__online-status">
                      <span className="student-dashboard__status-dot" />
                      Online
                    </div>
                  </div>

                  <CopilotWebChat user={copilotUser} />
                </div>

                <div className="student-dashboard__quicklinks c360-stagger" style={{ '--c360-stagger': 1 } as CSSProperties}>
                  {QUICK_LINKS.map(({ label, icon: Icon, iconColor, bgColor, url }) => (
                    <button
                      key={label}
                      type="button"
                      className="student-dashboard__ql-btn"
                      onClick={() => {
                        if (url) {
                          openCampusPortal(url, label);
                        }
                      }}
                    >
                      <span
                        className="student-dashboard__ql-icon"
                        style={{ background: bgColor }}
                      >
                        <Icon size={16} color={iconColor} aria-hidden />
                      </span>
                      <span className="student-dashboard__ql-label">{label}</span>
                    </button>
                  ))}
                </div>

                </div>

                <div className="student-dashboard__center-scroll">
                <div className="student-dashboard__card student-dashboard__tickets-card c360-stagger" style={{ '--c360-stagger': 2 } as CSSProperties}>
                  <div className="student-dashboard__section-header">
                    <div className="student-dashboard__section-title">
                      <IconTicket size={16} color="#2E5BA8" aria-hidden />
                      {selectedDay ? 'Scheduled Tickets' : 'Current Tickets'}
                    </div>
                    <div className="student-dashboard__section-actions">
                      <button
                        type="button"
                        className="student-dashboard__refresh-btn"
                        onClick={() => void refreshTickets()}
                        disabled={refreshingTickets}
                        aria-label="Refresh tickets"
                      >
                        <IconRefresh
                          size={14}
                          className={refreshingTickets ? 'spinning' : undefined}
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        className="student-dashboard__see-all"
                        onClick={() => navigate('/tickets')}
                      >
                        See all →
                      </button>
                    </div>
                  </div>
                  {selectedDay && (
                    <p className="student-dashboard__filter-hint">
                      Showing tickets for {formatSelectedDayLabel(selectedDay)}.
                      <button type="button" onClick={() => setSelectedDay(null)}>
                        Show all
                      </button>
                    </p>
                  )}
                  <table className="student-dashboard__tickets-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Concern</th>
                        <th>Status</th>
                        <th>Urgency</th>
                        <th>Department</th>
                        <th>Last Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTickets ? (
                        Array.from({ length: 4 }).map((_, index) => (
                          <tr key={index}>
                            <td colSpan={6}>
                              <Skeleton height={16} />
                            </td>
                          </tr>
                        ))
                      ) : filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState
                              title={selectedDay ? 'Nothing scheduled' : 'No tickets yet'}
                              description={
                                selectedDay
                                  ? 'No tickets are tied to this calendar day.'
                                  : 'Ask the AI helpdesk to open your first ticket.'
                              }
                              action={
                                !selectedDay ? (
                                  <button
                                    type="button"
                                    className="student-tickets__create-btn"
                                    onClick={goToDashboard}
                                  >
                                    Ask the AI helpdesk
                                  </button>
                                ) : undefined
                              }
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <tr
                            key={ticket.id}
                            className={`student-dashboard__ticket-row student-dashboard__ticket-row--${ticket.urgency}`}
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
                              {formatRelativeTime(ticket.updatedAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>

              <aside className="student-dashboard__right-col">
                <div className="student-dashboard__right-panel student-dashboard__right-panel--hero c360-stagger" style={{ '--c360-stagger': 3 } as CSSProperties}>
                  <div className="student-dashboard__right-section-label">
                    Upcoming Appointments
                  </div>
                  <div className="student-dashboard__cal-header">
                    <span>
                      {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
                    </span>
                    <div className="student-dashboard__cal-nav">
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() => shiftMonth(-1)}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={() => shiftMonth(1)}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                  {selectedDay && (
                    <p className="student-dashboard__filter-hint">
                      Calendar filter: {formatSelectedDayLabel(selectedDay)}.
                      <button type="button" onClick={() => setSelectedDay(null)}>
                        Clear
                      </button>
                    </p>
                  )}
                  <div className="student-dashboard__cal-grid">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div
                        key={d}
                        className="student-dashboard__cal-day-label"
                      >
                        {d}
                      </div>
                    ))}
                    {calendarDays.map((cell, i) => {
                      const isToday = sameCalendarDay(cell, today);
                      const isSelected =
                        selectedDay !== null && sameCalendarDay(cell, selectedDay);
                      const hasEvent = eventDayKeys.has(dayKey(cell));

                      return (
                        <button
                          key={`${cell.day}-${i}`}
                          type="button"
                          className={[
                            'student-dashboard__cal-day',
                            cell.otherMonth ? 'other-month' : '',
                            isToday ? 'today' : '',
                            isSelected ? 'selected' : '',
                            hasEvent ? 'has-event' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => handleDayClick(cell)}
                          aria-label={`${MONTH_NAMES[cell.month]} ${cell.day}, ${cell.year}`}
                          aria-pressed={isSelected}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                  <div className="student-dashboard__appointments-list">
                    {loadingAppointments ? (
                      <p className="student-dashboard__filter-hint">Loading appointments…</p>
                    ) : filteredAppointments.length === 0 ? (
                      <p className="student-dashboard__filter-hint">
                        {selectedDay
                          ? 'No appointments on this day.'
                          : 'No appointments this month.'}
                      </p>
                    ) : (
                      filteredAppointments.map((appt) => {
                        const isClickable = Boolean(
                          appt.ticketNumber || appt.appointmentId,
                        );

                        return (
                        <div
                          key={
                            appt.appointmentId ??
                            appt.ticketNumber ??
                            `${appt.title}-${appt.day}-${appt.time}`
                          }
                          className={`student-dashboard__appt-card ${appt.variant}`}
                          role={isClickable ? 'button' : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onClick={() => {
                            if (appt.ticketNumber) {
                              navigate(`/tickets/${appt.ticketNumber}`);
                            } else if (appt.appointmentId) {
                              navigate('/appointments');
                            }
                          }}
                          onKeyDown={(event) => {
                            if (
                              isClickable &&
                              (event.key === 'Enter' || event.key === ' ')
                            ) {
                              event.preventDefault();
                              if (appt.ticketNumber) {
                                navigate(`/tickets/${appt.ticketNumber}`);
                              } else if (appt.appointmentId) {
                                navigate('/appointments');
                              }
                            }
                          }}
                        >
                          <div className="student-dashboard__appt-title">
                            {appt.title}
                          </div>
                          <div className="student-dashboard__appt-time">
                            <IconClock size={12} aria-hidden />
                            {MONTH_NAMES[appt.month].slice(0, 3)} {appt.day} ·{' '}
                            {appt.time}
                          </div>
                          {appt.note && (
                            <div className="student-dashboard__appt-note">
                              {appt.note}
                            </div>
                          )}
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="student-dashboard__right-panel c360-stagger" style={{ '--c360-stagger': 4 } as CSSProperties}>
                  <div className="student-dashboard__right-section-label">
                    Your Progress
                  </div>
                  <div className="student-dashboard__progress-panel">
                    <div className="student-dashboard__progress-row">
                      <span>Ticket resolution rate</span>
                      <span className="student-dashboard__progress-value green">
                        {tickets.length === 0 ? '—' : `${resolutionRate}%`}
                      </span>
                    </div>
                    <div className="student-dashboard__progress-track">
                      <div
                        className="student-dashboard__progress-fill green"
                        style={{ width: `${resolutionRate}%` }}
                      />
                    </div>
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
