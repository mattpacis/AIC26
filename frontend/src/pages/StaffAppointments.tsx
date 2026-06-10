import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconCalendarEvent,
  IconCalendarPlus,
  IconCalendarX,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFilter,
  IconLogout,
  IconMapPin,
  IconPlus,
  IconSettings,
  IconTicket,
} from '@tabler/icons-react';
import {
  cancelAppointment,
  listStaffAppointments,
  rescheduleAppointment,
  userInitials,
  type AppointmentRecord,
} from '../api/client';
import { StaffNotifications } from '../components/StaffNotifications';
import { StaffRescheduleModal } from '../components/StaffRescheduleModal';
import { DEMO_TODAY } from '../config/demoDate';
import { useShellScale } from '../hooks/useShellScale';
import { useStaffShell } from '../hooks/useStaffShell';
import {
  buildCalendarGrid,
  dayKey,
  MONTH_NAMES,
  sameCalendarDay,
  type CalendarDay,
} from '../utils/calendar';
import './StaffDashboard.css';
import './StaffAppointments.css';

type StatusFilter = 'upcoming' | 'completed' | 'all';

function statusBadge(status: AppointmentRecord['status']) {
  switch (status) {
    case 'upcoming':
      return { className: 'staff-dashboard__b-sched', label: 'Upcoming' };
    case 'completed':
      return { className: 'staff-dashboard__b-resolved', label: 'Completed' };
    case 'cancelled':
      return { className: 'staff-dashboard__b-open', label: 'Cancelled' };
  }
}

function formatQueueTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameDay) return `Today, ${time}`;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function StaffAppointments() {
  const navigate = useNavigate();
  const { outerRef, shellRef } = useShellScale({ mobileBreakpoint: 1100 });
  const { staffUser, summary, navItems, handleLogout } = useStaffShell();

  const [viewMonth, setViewMonth] = useState({
    year: DEMO_TODAY.year,
    month: DEMO_TODAY.month,
  });
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(
    null,
  );

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { appointments: rows } = await listStaffAppointments({
        status: statusFilter,
        year: viewMonth.year,
        month: viewMonth.month,
      });
      setAppointments(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((row) => row.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, viewMonth.month, viewMonth.year]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    if (!selectedDay) return appointments;
    return appointments.filter((appt) => {
      const date = new Date(appt.scheduledAt);
      return sameCalendarDay(
        { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() },
        selectedDay,
      );
    });
  }, [appointments, selectedDay]);

  const selected =
    filteredAppointments.find((appt) => appt.id === selectedId) ??
    filteredAppointments[0];

  const calendarDays = buildCalendarGrid(viewMonth.year, viewMonth.month);
  const appointmentDayKeys = useMemo(
    () =>
      new Set(
        appointments.map((appt) => {
          const date = new Date(appt.scheduledAt);
          return dayKey({
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
          });
        }),
      ),
    [appointments],
  );

  const upcomingCount = appointments.filter((a) => a.status === 'upcoming').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const todayAppointments = appointments.filter((appt) => {
    const date = new Date(appt.scheduledAt);
    const today = new Date(DEMO_TODAY.year, DEMO_TODAY.month, DEMO_TODAY.day);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate() &&
      appt.status === 'upcoming'
    );
  });

  function shiftMonth(delta: number) {
    const next = new Date(viewMonth.year, viewMonth.month + delta, 1);
    setViewMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDay(null);
  }

  async function handleCancel(appointmentId: string) {
    setActionBusy(true);
    try {
      await cancelAppointment(appointmentId);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReschedule(startsAt: string) {
    if (!rescheduleTarget) return;
    setActionBusy(true);
    try {
      await rescheduleAppointment(rescheduleTarget.id, startsAt);
      setRescheduleTarget(null);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule appointment');
    } finally {
      setActionBusy(false);
    }
  }

  const departmentLabel = staffUser?.department ?? 'Department';

  return (
    <div className="staff-dashboard">
      <h2 className="staff-dashboard__sr-only">
        Campus360 staff appointments queue and detail
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
                {departmentLabel} — Appointments
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
                  New appointment
                </button>
                <StaffNotifications />
              </div>
            </header>

            {error && (
              <div className="staff-dashboard__content" style={{ padding: 16 }}>
                {error}
              </div>
            )}

            {rescheduleTarget && staffUser?.department && (
              <StaffRescheduleModal
                department={staffUser.department}
                ticketLabel={rescheduleTarget.title}
                excludeAppointmentId={rescheduleTarget.id}
                initialStartsAt={rescheduleTarget.scheduledAt}
                busy={actionBusy}
                onClose={() => setRescheduleTarget(null)}
                onConfirm={(startsAt) => void handleReschedule(startsAt)}
              />
            )}

            <div className="staff-dashboard__content">
              <div className="staff-dashboard__queue-col">
                <div className="staff-dashboard__queue-header">
                  <div className="staff-dashboard__queue-title">
                    <IconCalendarEvent size={15} color="#1B4080" aria-hidden />
                    {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
                    <span className="staff-dashboard__queue-count">
                      {filteredAppointments.length}
                    </span>
                  </div>
                  <div className="staff-appts__month-nav">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() => shiftMonth(-1)}
                    >
                      <IconChevronLeft size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() => shiftMonth(1)}
                    >
                      <IconChevronRight size={14} aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="staff-dashboard__filter-row">
                  {(['upcoming', 'completed', 'all'] as StatusFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`staff-dashboard__filter-chip${statusFilter === filter ? ' active' : ''}`}
                      onClick={() => setStatusFilter(filter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                  {selectedDay && (
                    <button
                      type="button"
                      className="staff-dashboard__filter-chip active"
                      onClick={() => setSelectedDay(null)}
                    >
                      Clear day filter
                    </button>
                  )}
                </div>

                <div className="staff-dashboard__ticket-list">
                  {loading && (
                    <div style={{ padding: 16, color: '#64748b' }}>
                      Loading appointments…
                    </div>
                  )}
                  {!loading && filteredAppointments.length === 0 && (
                    <div style={{ padding: 16, color: '#64748b' }}>
                      No appointments for this view.
                    </div>
                  )}
                  {filteredAppointments.map((appt) => {
                    const badge = statusBadge(appt.status);
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        className={`staff-dashboard__ticket-item${selected?.id === appt.id ? ' selected' : ''}`}
                        onClick={() => setSelectedId(appt.id)}
                      >
                        <div className="staff-dashboard__ti-row1">
                          <span className="staff-dashboard__ti-id">
                            {appt.ticketNumber ? `#${appt.ticketNumber}` : appt.date}
                          </span>
                          <span className="staff-dashboard__ti-time">
                            {formatQueueTime(appt.scheduledAt)}
                          </span>
                        </div>
                        <div className="staff-dashboard__ti-concern">{appt.title}</div>
                        <div className="staff-dashboard__ti-student">
                          {appt.studentName && appt.studentEmail
                            ? `${appt.studentName} · ${appt.studentEmail}`
                            : appt.miniSub}
                        </div>
                        <div className="staff-dashboard__ti-tags">
                          <span className={`staff-dashboard__badge ${badge.className}`}>
                            {badge.label}
                          </span>
                          {appt.location && (
                            <span className="staff-dashboard__badge staff-dashboard__b-ai">
                              {appt.location}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="staff-dashboard__center-col">
                {!selected ? (
                  <div className="staff-dashboard__ticket-detail" style={{ padding: 24 }}>
                    Select an appointment from the queue.
                  </div>
                ) : (
                  <div className="staff-dashboard__ticket-detail">
                    <div className="staff-dashboard__detail-header">
                      <div>
                        <div className="staff-dashboard__detail-title">
                          {selected.title}
                        </div>
                        <div className="staff-dashboard__detail-meta">
                          {selected.ticketNumber && (
                            <>
                              <span className="staff-dashboard__detail-id">
                                #{selected.ticketNumber}
                              </span>
                              <span>·</span>
                            </>
                          )}
                          <span>
                            {selected.date} · {selected.time}
                          </span>
                          <span>·</span>
                          <span
                            className={`staff-dashboard__badge ${statusBadge(selected.status).className}`}
                            style={{ fontSize: 11 }}
                          >
                            {statusBadge(selected.status).label}
                          </span>
                        </div>
                      </div>
                      <div className="staff-dashboard__detail-actions">
                        {selected.status === 'upcoming' && (
                          <>
                            <button
                              type="button"
                              className="staff-dashboard__action-btn"
                              disabled={actionBusy}
                              onClick={() => setRescheduleTarget(selected)}
                            >
                              <IconCalendarPlus size={13} aria-hidden />
                              Reschedule
                            </button>
                            <button
                              type="button"
                              className="staff-dashboard__action-btn"
                              disabled={actionBusy}
                              onClick={() => void handleCancel(selected.id)}
                            >
                              <IconCalendarX size={13} aria-hidden />
                              Cancel
                            </button>
                          </>
                        )}
                        {selected.ticketNumber && (
                          <button
                            type="button"
                            className="staff-dashboard__action-btn staff-dashboard__action-btn-success"
                            onClick={() =>
                              navigate(
                                `/staff-dashboard?ticket=${selected.ticketNumber}`,
                              )
                            }
                          >
                            <IconTicket size={13} aria-hidden />
                            Open ticket
                          </button>
                        )}
                      </div>
                    </div>

                    {selected.studentName && (
                      <div className="staff-dashboard__student-card">
                        <div className="staff-dashboard__stu-avatar">
                          {userInitials(selected.studentName)}
                        </div>
                        <div className="staff-dashboard__stu-info">
                          <div className="staff-dashboard__stu-name">
                            {selected.studentName}
                          </div>
                          <div className="staff-dashboard__stu-sub">
                            {selected.studentEmail ?? 'Student'}
                          </div>
                          <div className="staff-dashboard__stu-tags">
                            <span
                              className="staff-dashboard__badge"
                              style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                            >
                              {selected.department}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="staff-dashboard__info-grid">
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">Date & time</div>
                        <div className="staff-dashboard__info-value-sm">
                          {selected.date} · {selected.time}
                        </div>
                      </div>
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">Location</div>
                        <div className="staff-dashboard__info-value-sm">
                          <IconMapPin size={12} aria-hidden />{' '}
                          {selected.location ?? '—'}
                        </div>
                      </div>
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">Purpose</div>
                        <div className="staff-dashboard__info-value-sm">
                          {selected.purpose ?? '—'}
                        </div>
                      </div>
                      <div className="staff-dashboard__info-card">
                        <div className="staff-dashboard__info-label">Assigned staff</div>
                        <div className="staff-dashboard__info-value-sm">
                          {selected.staffName ?? staffUser?.name ?? 'Unassigned'}
                        </div>
                      </div>
                    </div>

                    {selected.bringItems.length > 0 && (
                      <>
                        <div className="staff-dashboard__section-sep">
                          Items student should bring
                        </div>
                        <div className="staff-dashboard__suggested-steps">
                          {selected.bringItems.map((item, index) => (
                            <div className="staff-dashboard__step-row" key={item}>
                              <div className="staff-dashboard__step-num">
                                {index + 1}
                              </div>
                              <div className="staff-dashboard__step-text">{item}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {selected.details.length > 0 && (
                      <>
                        <div className="staff-dashboard__section-sep">
                          Additional details
                        </div>
                        <div className="staff-dashboard__info-grid">
                          {selected.details.map((row) => (
                            <div className="staff-dashboard__info-card" key={row.label}>
                              <div className="staff-dashboard__info-label">
                                {row.label}
                              </div>
                              <div
                                className={`staff-dashboard__info-value-sm${row.warn ? ' staff-dashboard__info-value-warn' : ''}`}
                              >
                                {row.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <aside className="staff-dashboard__right-col">
                <div>
                  <div className="staff-dashboard__right-section-label">
                    {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
                  </div>
                  <div className="staff-appts__mini-calendar">
                    {calendarDays.map((day) => {
                      const key = dayKey(day);
                      const hasAppt = appointmentDayKeys.has(key);
                      const isSelected =
                        selectedDay &&
                        sameCalendarDay(day, selectedDay) &&
                        !day.otherMonth;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={day.otherMonth}
                          className={`staff-appts__mini-day${isSelected ? ' selected' : ''}${hasAppt ? ' has-appt' : ''}${day.otherMonth ? ' muted' : ''}`}
                          onClick={() => setSelectedDay(day)}
                        >
                          {day.day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="staff-dashboard__right-section-label">
                    This month
                  </div>
                  <div className="staff-dashboard__stat-grid">
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num blue">
                        {upcomingCount}
                      </div>
                      <div className="staff-dashboard__stat-label">Upcoming</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num green">
                        {completedCount}
                      </div>
                      <div className="staff-dashboard__stat-label">Completed</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num">
                        {appointments.length}
                      </div>
                      <div className="staff-dashboard__stat-label">Total</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num amber">
                        {summary?.todayAppointmentCount ?? todayAppointments.length}
                      </div>
                      <div className="staff-dashboard__stat-label">Today</div>
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
                      <button
                        key={appt.id}
                        type="button"
                        className="staff-dashboard__appt-item"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedId(appt.id)}
                      >
                        <div className="staff-dashboard__appt-name">
                          {appt.studentName ?? appt.title}
                        </div>
                        <div className="staff-dashboard__appt-detail">
                          {appt.title} · {appt.time}
                          {appt.location ? ` · ${appt.location}` : ''}
                        </div>
                      </button>
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
