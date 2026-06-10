import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconBell,
  IconBuildingCommunity,
  IconCalendar,
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconFilter,
  IconLogout,
  IconMapPin,
  IconPlus,
  IconSettings,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import {
  cancelAppointment,
  createAppointment,
  deleteAppointment,
  getAppointmentAvailability,
  getAppointmentSummary,
  getHoldSummary,
  getMe,
  listAppointmentDepartments,
  listAppointments,
  logout,
  rescheduleAppointment,
  userInitials,
  type AppointmentDepartment,
  type AppointmentRecord,
  type AppointmentSummary,
  type DepartmentAvailability,
  type User,
} from '../api/client';
import { DEMO_TODAY, isBeforeDemoToday } from '../config/demoDate';
import { getStudentNavItems } from '../config/studentNav';
import { urgencyLabelAppointmentBadgeClass } from '../utils/ticketDisplay';
import { useShellScale } from '../hooks/useShellScale';
import {
  buildCalendarGrid,
  dayKey,
  formatSelectedDayLabel,
  MONTH_NAMES,
  sameCalendarDay,
  type CalendarDay,
} from '../utils/calendar';
import './StudentAppointments.css';

const TODAY: CalendarDay = {
  year: DEMO_TODAY.year,
  month: DEMO_TODAY.month,
  day: DEMO_TODAY.day,
  otherMonth: false,
};

const DEFAULT_VIEW_MONTH = {
  year: DEMO_TODAY.year,
  month: DEMO_TODAY.month,
};

type StatusFilter = 'all' | 'upcoming' | 'completed';

type SlotPickerProps = {
  department: string;
  selectedStartsAt: string | null;
  onSelect: (startsAt: string) => void;
  excludeAppointmentId?: string;
  initialStartsAt?: string;
};

function AppointmentSlotPicker({
  department,
  selectedStartsAt,
  onSelect,
  excludeAppointmentId,
  initialStartsAt,
}: SlotPickerProps) {
  const initial = initialStartsAt
    ? new Date(initialStartsAt)
    : new Date(DEMO_TODAY.year, DEMO_TODAY.month, DEMO_TODAY.day);
  const [pickerMonth, setPickerMonth] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [pickerDay, setPickerDay] = useState<CalendarDay | null>(null);
  const [availability, setAvailability] = useState<DepartmentAvailability | null>(
    null,
  );
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!department) {
      setAvailability(null);
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);

    void getAppointmentAvailability({
      department,
      year: pickerMonth.year,
      month: pickerMonth.month,
      excludeAppointmentId,
    })
      .then((data) => {
        if (!cancelled) setAvailability(data.availability);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [department, pickerMonth.year, pickerMonth.month, excludeAppointmentId]);

  useEffect(() => {
    if (!initialStartsAt || !availability) return;
    const date = new Date(initialStartsAt);
    setPickerDay({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      otherMonth: false,
    });
  }, [initialStartsAt, availability?.department, availability?.month]);

  const calendarDays = buildCalendarGrid(pickerMonth.year, pickerMonth.month);
  const availableDayKeys = new Set(
    (availability?.slots ?? []).map((slot) =>
      dayKey({ year: slot.year, month: slot.month, day: slot.day }),
    ),
  );

  const daySlots =
    pickerDay && availability
      ? availability.slots.filter((slot) =>
          sameCalendarDay(slot, pickerDay),
        )
      : [];

  function shiftPickerMonth(delta: number) {
    const next = new Date(pickerMonth.year, pickerMonth.month + delta, 1);
    setPickerMonth({ year: next.getFullYear(), month: next.getMonth() });
    setPickerDay(null);
  }

  if (!department) {
    return (
      <p className="student-appointments__slot-empty">
        Select a department to see available dates.
      </p>
    );
  }

  return (
    <div className="student-appointments__slot-section">
      <div className="student-appointments__slot-section-label">
        Available dates
      </div>
      <div className="student-appointments__slot-cal-header">
        <div className="student-appointments__slot-cal-title">
          {MONTH_NAMES[pickerMonth.month]} {pickerMonth.year}
        </div>
        <div className="student-appointments__slot-cal-nav">
          <button
            type="button"
            className="student-appointments__cal-nav-btn"
            aria-label="Previous month"
            onClick={() => shiftPickerMonth(-1)}
          >
            <IconChevronLeft size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="student-appointments__cal-nav-btn"
            aria-label="Next month"
            onClick={() => shiftPickerMonth(1)}
          >
            <IconChevronRight size={14} aria-hidden />
          </button>
        </div>
      </div>

      {loadingSlots ? (
        <p className="student-appointments__slot-empty">Loading availability…</p>
      ) : (
        <>
          <div className="student-appointments__slot-cal-grid">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => (
              <div
                key={label}
                className="student-appointments__slot-cal-day-label"
              >
                {label}
              </div>
            ))}
            {calendarDays.map((cell, index) => {
              const hasSlots = availableDayKeys.has(dayKey(cell));
              const isPast = isBeforeDemoToday(cell);
              const isSelectable = hasSlots && !isPast;
              const isSelected =
                pickerDay !== null && sameCalendarDay(cell, pickerDay);

              return (
                <button
                  key={`${cell.day}-${index}`}
                  type="button"
                  className={[
                    'student-appointments__slot-cal-day',
                    cell.otherMonth ? 'other-month' : '',
                    isSelectable ? 'available' : '',
                    isSelected ? 'selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!isSelectable}
                  onClick={() => setPickerDay(cell)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="student-appointments__slot-section" style={{ marginTop: 12 }}>
            <div className="student-appointments__slot-section-label">
              {pickerDay
                ? `Times on ${formatSelectedDayLabel(pickerDay)}`
                : 'Select a highlighted date'}
            </div>
            {pickerDay && daySlots.length === 0 ? (
              <p className="student-appointments__slot-empty">
                No open times on this day.
              </p>
            ) : (
              <div className="student-appointments__slot-times">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`student-appointments__slot-time-btn${
                      selectedStartsAt === slot.startsAt ? ' selected' : ''
                    }`}
                    onClick={() => onSelect(slot.startsAt)}
                  >
                    {slot.timeLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function StudentAppointments() {
  const navigate = useNavigate();
  const location = useLocation();
  const [holdsCount, setHoldsCount] = useState(0);
  const navItems = getStudentNavItems(location.pathname, { holdsCount });
  const { outerRef, shellRef } = useShellScale();
  const filterRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [monthAppointments, setMonthAppointments] = useState<AppointmentRecord[]>(
    [],
  );
  const [summary, setSummary] = useState<AppointmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMonth, setViewMonth] = useState(DEFAULT_VIEW_MONTH);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRecord | null>(
    null,
  );

  const [departments, setDepartments] = useState<AppointmentDepartment[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSelectedSlot, setFormSelectedSlot] = useState<string | null>(null);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState<string | null>(
    null,
  );

  async function loadData() {
    setError(null);
    try {
      const listParams: {
        status: StatusFilter;
        year: number;
        month: number;
        day?: number;
      } = {
        status: statusFilter,
        year: viewMonth.year,
        month: viewMonth.month,
      };

      if (selectedDay) {
        listParams.day = selectedDay.day;
        listParams.year = selectedDay.year;
        listParams.month = selectedDay.month;
      }

      const [me, appointmentData, monthData, summaryData, departmentData, holdsData] =
        await Promise.all([
          getMe(),
          listAppointments(listParams),
          listAppointments({
            status: 'all',
            year: viewMonth.year,
            month: viewMonth.month,
          }),
          getAppointmentSummary(),
          listAppointmentDepartments(),
          getHoldSummary(),
        ]);

      setUser(me.user);
      setAppointments(appointmentData.appointments);
      setMonthAppointments(monthData.appointments);
      setSummary(summaryData.summary);
      setDepartments(departmentData.departments);
      setHoldsCount(holdsData.summary.activeCount);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load appointments';
      if (message.toLowerCase().includes('authentication')) {
        navigate('/login');
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [navigate, viewMonth.year, viewMonth.month, selectedDay, statusFilter]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calendarDays = buildCalendarGrid(viewMonth.year, viewMonth.month);
  const eventDayKeys = new Set<string>();

  for (const appt of monthAppointments) {
    const date = new Date(appt.scheduledAt);
    eventDayKeys.add(
      dayKey({
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      }),
    );
  }

  const detailCards =
    statusFilter === 'completed'
      ? appointments.filter((appt) => appt.status === 'completed')
      : appointments.filter((appt) => appt.status === 'upcoming');

  const detailHeading =
    statusFilter === 'completed'
      ? selectedDay
        ? `Completed on ${formatSelectedDayLabel(selectedDay)}`
        : 'Completed appointments'
      : selectedDay
        ? `Appointments on ${formatSelectedDayLabel(selectedDay)}`
        : 'Upcoming appointments';

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Still return to login if logout fails.
    }
    navigate('/login');
  }

  function scrollToAppointment(id: string) {
    document.getElementById(`appt-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  }

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

  function openReschedule(appt: AppointmentRecord) {
    setRescheduleTarget(appt);
    setRescheduleSelectedSlot(appt.scheduledAt);
  }

  function handleDepartmentChange(label: string) {
    setFormDepartment(label);
    setFormSelectedSlot(null);
    const dept = departments.find((entry) => entry.label === label);
    if (dept) {
      setFormLocation(dept.defaultLocation);
    }
  }

  async function handleRequestSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !formTitle.trim() ||
      !formDepartment.trim() ||
      !formSelectedSlot ||
      actionLoading
    ) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await createAppointment({
        title: formTitle.trim(),
        department: formDepartment.trim(),
        purpose: formPurpose.trim() || undefined,
        location: formLocation.trim() || undefined,
        scheduledAt: formSelectedSlot,
      });
      setRequestOpen(false);
      setFormTitle('');
      setFormDepartment('');
      setFormPurpose('');
      setFormLocation('');
      setFormSelectedSlot(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request appointment');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRescheduleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!rescheduleTarget || !rescheduleSelectedSlot || actionLoading) return;

    setActionLoading(true);
    setError(null);
    try {
      await rescheduleAppointment(
        rescheduleTarget.id,
        rescheduleSelectedSlot,
      );
      setRescheduleTarget(null);
      setRescheduleSelectedSlot(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule appointment');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(appt: AppointmentRecord) {
    const confirmed = window.confirm(
      `Cancel "${appt.title}" on ${appt.date} at ${appt.time}?`,
    );
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);
    try {
      await cancelAppointment(appt.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(appt: AppointmentRecord) {
    const confirmed = window.confirm(
      `Remove "${appt.title}" from your completed appointments?`,
    );
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);
    try {
      await deleteAppointment(appt.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove appointment');
    } finally {
      setActionLoading(false);
    }
  }

  if (!user && loading) {
    return null;
  }

  const displayUser = user
    ? {
        initials: userInitials(user.name),
        name: user.name,
      }
    : { initials: '—', name: 'Student' };

  return (
    <div className="student-appointments">
      <h2 className="student-appointments__sr-only">
        Campus360 student appointments page with calendar, upcoming appointment
        cards, and appointment details
      </h2>

      <div className="student-appointments__outer" ref={outerRef}>
        <div className="student-appointments__shell" ref={shellRef}>
          <aside className="student-appointments__sidebar">
            <div className="student-appointments__sb-logo">
              <div className="student-appointments__sb-logo-icon">
                <IconBuildingCommunity size={20} aria-hidden />
              </div>
              <span className="student-appointments__sb-logo-text">Campus360</span>
            </div>

            <nav className="student-appointments__sb-nav">
              {navItems.map(({ label, icon: Icon, path, active, badge }) => (
                <button
                  key={label}
                  type="button"
                  className={`student-appointments__nav-item${active ? ' active' : ''}`}
                  onClick={() => navigate(path)}
                >
                  <Icon size={17} aria-hidden />
                  {label}
                  {badge !== undefined && (
                    <span className="student-appointments__nav-badge">{badge}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="student-appointments__sb-footer">
              <button type="button" className="student-appointments__nav-item">
                <IconSettings size={17} aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="student-appointments__nav-item"
                onClick={handleLogout}
              >
                <IconLogout size={17} aria-hidden />
                Logout
              </button>
            </div>
          </aside>

          <div className="student-appointments__main">
            <header className="student-appointments__topbar">
              <div className="student-appointments__topbar-title">Appointments</div>
              <div className="student-appointments__topbar-right">
                <div className="student-appointments__filter-wrap" ref={filterRef}>
                  <button
                    type="button"
                    className={`student-appointments__tb-btn${
                      statusFilter !== 'all' ? ' student-appointments__tb-btn-active' : ''
                    }`}
                    onClick={() => setFilterOpen((open) => !open)}
                  >
                    <IconFilter size={14} aria-hidden />
                    Filter
                  </button>
                  {filterOpen && (
                    <div className="student-appointments__filter-menu">
                      {(['all', 'upcoming', 'completed'] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`student-appointments__filter-option${
                            statusFilter === value ? ' active' : ''
                          }`}
                          onClick={() => {
                            setStatusFilter(value);
                            setFilterOpen(false);
                          }}
                        >
                          {value === 'all'
                            ? 'All appointments'
                            : value === 'upcoming'
                              ? 'Upcoming only'
                              : 'Completed only'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="student-appointments__tb-btn student-appointments__tb-btn-primary"
                  onClick={() => setRequestOpen(true)}
                >
                  <IconPlus size={14} aria-hidden />
                  Request appointment
                </button>
                <button
                  type="button"
                  className="student-appointments__tb-icon"
                  aria-label="Notifications"
                >
                  <IconBell size={18} aria-hidden />
                  <span className="student-appointments__notif-dot" />
                </button>
                <div className="student-appointments__user-wrap">
                  <div className="student-appointments__user-avatar">
                    {displayUser.initials}
                  </div>
                  <span className="student-appointments__user-name">
                    {displayUser.name}
                  </span>
                </div>
              </div>
            </header>

            {error && <p className="student-appointments__error-banner">{error}</p>}

            <div className="student-appointments__content">
              <div className="student-appointments__left-col">
                <div className="student-appointments__section-label">Calendar</div>
                <div className="student-appointments__cal-header">
                  <div className="student-appointments__cal-title">
                    {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
                  </div>
                  <div className="student-appointments__cal-nav">
                    <button
                      type="button"
                      className="student-appointments__cal-nav-btn"
                      aria-label="Previous month"
                      onClick={() => shiftMonth(-1)}
                    >
                      <IconChevronLeft size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="student-appointments__cal-nav-btn"
                      aria-label="Next month"
                      onClick={() => shiftMonth(1)}
                    >
                      <IconChevronRight size={14} aria-hidden />
                    </button>
                  </div>
                </div>

                {selectedDay && (
                  <p className="student-appointments__filter-hint">
                    Showing {formatSelectedDayLabel(selectedDay)}.
                    <button type="button" onClick={() => setSelectedDay(null)}>
                      Clear
                    </button>
                  </p>
                )}

                <div className="student-appointments__cal-grid">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div
                      key={d}
                      className="student-appointments__cal-day-label"
                    >
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((cell, i) => {
                    const isToday = sameCalendarDay(cell, TODAY);
                    const isSelected =
                      selectedDay !== null && sameCalendarDay(cell, selectedDay);
                    const hasEvent = eventDayKeys.has(dayKey(cell));

                    return (
                      <button
                        key={`${cell.day}-${i}`}
                        type="button"
                        className={[
                          'student-appointments__cal-day',
                          cell.otherMonth ? 'other-month' : '',
                          isToday ? 'today' : '',
                          isSelected ? 'selected' : '',
                          hasEvent ? 'has-event' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => handleDayClick(cell)}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                <div className="student-appointments__divider" />

                <div className="student-appointments__section-label">
                  {selectedDay
                    ? `Appointments on ${formatSelectedDayLabel(selectedDay)}`
                    : 'All appointments this month'}
                </div>

                {loading ? (
                  <p className="student-appointments__empty-note">Loading…</p>
                ) : appointments.length === 0 ? (
                  <p className="student-appointments__empty-note">
                    No appointments match this view.
                  </p>
                ) : (
                  appointments.map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      className="student-appointments__appt-mini"
                      onClick={() => scrollToAppointment(appt.id)}
                    >
                      <span
                        className="student-appointments__apmt-dot"
                        style={{ background: appt.barColor }}
                      />
                      <span>
                        <div className="student-appointments__apmt-title">
                          {appt.title}
                        </div>
                        <div className="student-appointments__apmt-sub">
                          {appt.miniSub}
                        </div>
                      </span>
                      <span
                        className={`student-appointments__badge ${
                          appt.status === 'upcoming'
                            ? 'student-appointments__b-scheduled'
                            : 'student-appointments__b-completed'
                        }`}
                      >
                        {appt.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="student-appointments__right-col">
                <div className="student-appointments__stat-row">
                  <div className="student-appointments__stat-card">
                    <div className="student-appointments__stat-num blue">
                      {summary?.upcomingCount ?? 0}
                    </div>
                    <div className="student-appointments__stat-label">Upcoming</div>
                  </div>
                  <div className="student-appointments__stat-card">
                    <div className="student-appointments__stat-num green">
                      {summary?.completedCount ?? 0}
                    </div>
                    <div className="student-appointments__stat-label">Completed</div>
                  </div>
                  <div className="student-appointments__stat-card">
                    <div className="student-appointments__stat-num amber">
                      {summary?.nextAppointment?.label ?? '—'}
                    </div>
                    <div className="student-appointments__stat-label">
                      Next appointment
                    </div>
                  </div>
                </div>

                {summary?.reminder && (
                  <div className="student-appointments__notif-pill">
                    <IconCheck size={15} aria-hidden />
                    {summary.reminder}
                  </div>
                )}

                <div className="student-appointments__section-heading">
                  {detailHeading}
                </div>

                {loading ? (
                  <p className="student-appointments__empty-note">Loading…</p>
                ) : detailCards.length === 0 ? (
                  <p className="student-appointments__empty-note">
                    {statusFilter === 'completed'
                      ? selectedDay
                        ? 'No completed appointments on this day.'
                        : 'No completed appointments.'
                      : selectedDay
                        ? 'No upcoming appointments on this day.'
                        : 'No upcoming appointments right now.'}
                  </p>
                ) : (
                  detailCards.map((appt) => (
                    <div
                      key={appt.id}
                      id={`appt-${appt.id}`}
                      className="student-appointments__appt-card-full"
                    >
                      <div className="student-appointments__appt-card-inner">
                        <div
                          className="student-appointments__appt-type-bar"
                          style={{ background: appt.barColor }}
                        />
                        <div className="student-appointments__appt-card-content">
                          <div className="student-appointments__appt-card-top">
                            <div className="student-appointments__appt-card-heading">
                              <div className="student-appointments__appt-card-title-row">
                                <span className="student-appointments__appt-card-title">
                                  {appt.title}
                                </span>
                                <span
                                  className={`student-appointments__badge ${
                                    appt.status === 'upcoming'
                                      ? 'student-appointments__b-scheduled'
                                      : 'student-appointments__b-completed'
                                  }`}
                                >
                                  {appt.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                                </span>
                                {appt.urgencyLabel && (
                                  <span
                                    className={`student-appointments__badge ${urgencyLabelAppointmentBadgeClass(appt.urgencyLabel)}`}
                                  >
                                    {appt.urgencyLabel}
                                  </span>
                                )}
                              </div>
                              <div className="student-appointments__appt-card-meta">
                                <span>
                                  <IconCalendar size={13} aria-hidden />
                                  {appt.date}
                                </span>
                                <span>
                                  <IconClock size={13} aria-hidden />
                                  {appt.time}
                                </span>
                                {appt.location && (
                                  <span>
                                    <IconMapPin size={13} aria-hidden />
                                    {appt.location}
                                  </span>
                                )}
                                {appt.staffName && (
                                  <span>
                                    <IconUser size={13} aria-hidden />
                                    {appt.staffName}
                                  </span>
                                )}
                              </div>
                            </div>
                            {appt.status === 'upcoming' ? (
                              <div className="student-appointments__appt-card-actions">
                                <button
                                  type="button"
                                  className="student-appointments__action-btn"
                                  disabled={actionLoading}
                                  onClick={() => openReschedule(appt)}
                                >
                                  <IconCalendarEvent size={13} aria-hidden />
                                  Reschedule
                                </button>
                                <button
                                  type="button"
                                  className="student-appointments__action-btn student-appointments__action-btn-danger"
                                  disabled={actionLoading}
                                  onClick={() => void handleCancel(appt)}
                                >
                                  <IconX size={13} aria-hidden />
                                  Cancel
                                </button>
                              </div>
                            ) : appt.status === 'completed' ? (
                              <div className="student-appointments__appt-card-actions">
                                <button
                                  type="button"
                                  className="student-appointments__action-btn student-appointments__action-btn-danger"
                                  disabled={actionLoading}
                                  onClick={() => void handleDelete(appt)}
                                >
                                  <IconTrash size={13} aria-hidden />
                                  Remove
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="student-appointments__appt-card-body">
                            <div
                              className={`student-appointments__appt-detail-grid${
                                appt.bringItems.length ? ' has-bring-items' : ''
                              }`}
                            >
                              <div className="student-appointments__appt-detail-col">
                                <div className="student-appointments__detail-label">
                                  Appointment details
                                </div>
                                <div className="student-appointments__info-panel">
                                  {appt.details.map((row) => (
                                    <div
                                      className="student-appointments__info-row"
                                      key={row.label}
                                    >
                                      <span className="student-appointments__info-label">
                                        {row.label}
                                      </span>
                                      {row.link ? (
                                        <button
                                          type="button"
                                          className="student-appointments__info-value student-appointments__info-value-link"
                                          onClick={() =>
                                            navigate(`/tickets/${row.link}`)
                                          }
                                        >
                                          {row.value}
                                        </button>
                                      ) : (
                                        <span
                                          className={`student-appointments__info-value${
                                            row.warn
                                              ? ' student-appointments__info-value-warn'
                                              : ''
                                          }`}
                                        >
                                          {row.value}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {appt.bringItems.length > 0 && (
                                <div className="student-appointments__appt-detail-col">
                                  <div className="student-appointments__detail-label">
                                    What to bring
                                  </div>
                                  <div className="student-appointments__checklist-panel">
                                    {appt.bringItems.map((item) => (
                                      <div
                                        className="student-appointments__checklist-item"
                                        key={item}
                                      >
                                        <span className="student-appointments__check-circle">
                                          <IconCheck size={11} aria-hidden />
                                        </span>
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {requestOpen && (
        <div
          className="student-appointments__modal-overlay"
          onClick={() => !actionLoading && setRequestOpen(false)}
        >
          <div
            className="student-appointments__modal student-appointments__modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label="Request appointment"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Request appointment</h3>
            <form onSubmit={handleRequestSubmit}>
              <div className="student-appointments__modal-body">
                <label>
                  Title
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Department
                  <select
                    value={formDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    required
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept.key} value={dept.label}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Purpose
                  <input
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                  />
                </label>
                <label>
                  Location
                  <input
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </label>
                <AppointmentSlotPicker
                  department={formDepartment}
                  selectedStartsAt={formSelectedSlot}
                  onSelect={setFormSelectedSlot}
                />
              </div>
              <div className="student-appointments__modal-actions">
                <button
                  type="button"
                  className="student-appointments__action-btn"
                  onClick={() => setRequestOpen(false)}
                  disabled={actionLoading}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="student-appointments__tb-btn student-appointments__tb-btn-primary"
                  disabled={actionLoading || !formSelectedSlot}
                >
                  {actionLoading ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rescheduleTarget && (
        <div
          className="student-appointments__modal-overlay"
          onClick={() => !actionLoading && setRescheduleTarget(null)}
        >
          <div
            className="student-appointments__modal student-appointments__modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label="Reschedule appointment"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Reschedule appointment</h3>
            <p>
              {rescheduleTarget.title} · {rescheduleTarget.department}
            </p>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="student-appointments__modal-body">
                <AppointmentSlotPicker
                  department={rescheduleTarget.department}
                  selectedStartsAt={rescheduleSelectedSlot}
                  onSelect={setRescheduleSelectedSlot}
                  excludeAppointmentId={rescheduleTarget.id}
                  initialStartsAt={rescheduleTarget.scheduledAt}
                />
              </div>
              <div className="student-appointments__modal-actions">
                <button
                  type="button"
                  className="student-appointments__action-btn"
                  onClick={() => setRescheduleTarget(null)}
                  disabled={actionLoading}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="student-appointments__tb-btn student-appointments__tb-btn-primary"
                  disabled={actionLoading || !rescheduleSelectedSlot}
                >
                  {actionLoading ? 'Saving…' : 'Save new time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
