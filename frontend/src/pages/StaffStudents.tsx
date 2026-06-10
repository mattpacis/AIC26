import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconCalendarPlus,
  IconCash,
  IconLogout,
  IconMail,
  IconNotes,
  IconSearch,
  IconSettings,
  IconTicket,
} from '@tabler/icons-react';
import {
  getStaffStudentProfile,
  listStaffStudents,
  type StaffStudentListItem,
  type StaffStudentProfile,
} from '../api/client';
import { StaffNotifications } from '../components/StaffNotifications';
import { useShellScale } from '../hooks/useShellScale';
import { useStaffShell } from '../hooks/useStaffShell';
import './StaffStudents.css';

type FilterKey = 'all' | 'holds' | 'health-flags' | 'open-tickets';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'holds', label: 'Holds' },
  { key: 'health-flags', label: 'Health' },
  { key: 'open-tickets', label: 'Open tickets' },
];

const AVATAR_PALETTE = [
  { bg: '#EFF6FF', color: '#1D4ED8' },
  { bg: '#F0FDFA', color: '#0F766E' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#F5F3FF', color: '#5B21B6' },
  { bg: '#F0FDF4', color: '#16A34A' },
];

function avatarStyle(name: string) {
  const code = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

function listTagClass(type: 'hold' | 'sched') {
  return type === 'hold' ? 'staff-students__b-hold' : 'staff-students__b-sched';
}

function profileTagClass(type?: string) {
  if (type === 'hold') return 'staff-students__b-hold';
  if (type === 'flag') return 'staff-students__b-flag';
  if (type === 'clear') return 'staff-students__b-clear';
  return '';
}

function ticketStatusClass(status: string) {
  switch (status) {
    case 'open':
      return 'staff-students__b-flag';
    case 'progress':
      return 'staff-students__b-prog';
    case 'pending':
    case 'sched':
      return 'staff-students__b-sched';
    case 'resolved':
      return 'staff-students__b-clear';
    default:
      return '';
  }
}

function apiFilters(filter: FilterKey) {
  switch (filter) {
    case 'holds':
      return { holds: true };
    case 'open-tickets':
      return { openTickets: true };
    default:
      return {};
  }
}

function matchesClientFilter(student: StaffStudentListItem, filter: FilterKey) {
  if (filter === 'health-flags') return student.hasHealthFlag;
  return true;
}

function matchesSearch(student: StaffStudentListItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    student.name.toLowerCase().includes(q) ||
    student.id.toLowerCase().includes(q) ||
    student.email.toLowerCase().includes(q)
  );
}

export function StaffStudents() {
  const navigate = useNavigate();
  const { outerRef, shellRef } = useShellScale({ mobileBreakpoint: 1100 });
  const { staffUser, navItems, handleLogout } = useStaffShell();

  const [students, setStudents] = useState<StaffStudentListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StaffStudentProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { students: rows } = await listStaffStudents(apiFilters(activeFilter));
      setStudents(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((s) => s.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    void getStaffStudentProfile(selectedId)
      .then(({ student }) => {
        if (!cancelled) setProfile(student);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load student profile');
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) => matchesClientFilter(s, activeFilter) && matchesSearch(s, search),
      ),
    [students, activeFilter, search],
  );

  const selected =
    profile ?? students.find((s) => s.id === selectedId) ?? filteredStudents[0];

  function handleSchedule() {
    if (!selected) return;
    navigate('/staff/appointments', {
      state: {
        studentEmail: selected.email,
        studentName: selected.name,
      },
    });
  }

  function handleNewTicket() {
    if (!selected) return;
    const openTicket = profile?.tickets.find(
      (ticket) => ticket.status !== 'resolved',
    );
    if (openTicket) {
      navigate(`/staff-dashboard?ticket=${openTicket.ticketNumber}`);
      return;
    }
    navigate('/staff-dashboard');
  }

  const departmentLabel = staffUser?.department ?? 'Department';

  return (
    <div className="staff-students">
      <h2 className="staff-students__sr-only">
        Campus360 staff students directory with search, filters, and student profile detail
      </h2>

      <div className="staff-students__outer" ref={outerRef}>
        <div className="staff-students__shell" ref={shellRef}>
          <aside className="staff-students__sidebar">
            <div className="staff-students__sb-logo">
              <div className="staff-students__sb-logo-icon">
                <IconBuildingCommunity size={18} aria-hidden />
              </div>
              <span className="staff-students__sb-logo-text">Campus360</span>
            </div>

            <div className="staff-students__sb-staff-wrap">
              <div className="staff-students__sb-staff">
                <div className="staff-students__sb-avatar">
                  {staffUser?.initials ?? '—'}
                </div>
                <div>
                  <div className="staff-students__sb-name">
                    {staffUser?.name ?? 'Loading…'}
                  </div>
                  <div className="staff-students__sb-role">
                    {staffUser?.roleLabel ?? 'Staff'}
                  </div>
                </div>
              </div>
            </div>

            <div className="staff-students__sb-dept">Department</div>
            <nav className="staff-students__sb-nav">
              {navItems.map(
                ({ label, icon: Icon, path, active, badge, badgeAmber }) => (
                  <button
                    key={label}
                    type="button"
                    className={`staff-students__nav-item${active ? ' active' : ''}`}
                    onClick={() => navigate(path)}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                    {badge !== undefined && badge > 0 && (
                      <span className="staff-students__nav-badge">{badge}</span>
                    )}
                    {badgeAmber !== undefined && badgeAmber > 0 && (
                      <span className="staff-students__nav-badge-amber">
                        {badgeAmber}
                      </span>
                    )}
                  </button>
                ),
              )}
            </nav>

            <div className="staff-students__sb-dept staff-students__sb-dept.system">
              System
            </div>
            <div className="staff-students__sb-system">
              <button type="button" className="staff-students__nav-item">
                <IconSettings size={16} aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="staff-students__nav-item"
                onClick={() => void handleLogout()}
              >
                <IconLogout size={16} aria-hidden />
                Logout
              </button>
            </div>
            <div className="staff-students__sb-spacer" />
          </aside>

          <div className="staff-students__main">
            <header className="staff-students__topbar">
              <div className="staff-students__topbar-title">Students</div>
              <StaffNotifications
                buttonClassName="staff-students__tb-icon"
                dotClassName="staff-students__notif-dot"
              />
            </header>

            {error && <div className="staff-students__error">{error}</div>}

            <div className="staff-students__content">
              <div className="staff-students__list-col">
                <div className="staff-students__list-header">
                  <div className="staff-students__search-wrap">
                    <IconSearch size={15} className="staff-students__search-icon" aria-hidden />
                    <input
                      className="staff-students__search-input"
                      placeholder="Search name, ID, email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="staff-students__filter-row">
                    {FILTERS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={`staff-students__filter-chip${activeFilter === key ? ' active' : ''}`}
                        onClick={() => setActiveFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="staff-students__list-meta">
                    {filteredStudents.length} student
                    {filteredStudents.length === 1 ? '' : 's'} · {departmentLabel}
                  </div>
                </div>

                <div className="staff-students__student-list">
                  {loading && (
                    <p className="staff-students__empty">Loading students…</p>
                  )}
                  {!loading && filteredStudents.length === 0 && (
                    <p className="staff-students__empty">No students match this filter.</p>
                  )}
                  {filteredStudents.map((student) => {
                    const av = avatarStyle(student.name);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        className={`staff-students__student-item${selected?.id === student.id ? ' selected' : ''}`}
                        onClick={() => setSelectedId(student.id)}
                      >
                        <div
                          className="staff-students__stu-av"
                          style={{ background: av.bg, color: av.color }}
                        >
                          {student.initials}
                        </div>
                        <div className="staff-students__stu-info">
                          <div className="staff-students__stu-row">
                            <span className="staff-students__stu-name">{student.name}</span>
                            {student.listTags.length > 0 && (
                              <span className="staff-students__stu-tags">
                                {student.listTags.map((tag) => (
                                  <span
                                    key={tag.label}
                                    className={`staff-students__badge ${listTagClass(tag.type)}`}
                                  >
                                    {tag.label}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                          <div className="staff-students__stu-sub">{student.id}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="staff-students__profile-col">
                {!selected ? (
                  <div className="staff-students__empty-panel">
                    Select a student from the list.
                  </div>
                ) : (
                  <div className="staff-students__profile-card">
                    <div className="staff-students__profile-header">
                      <div
                        className="staff-students__profile-av"
                        style={{
                          background: avatarStyle(selected.name).bg,
                          color: avatarStyle(selected.name).color,
                        }}
                      >
                        {selected.initials}
                      </div>
                      <div className="staff-students__profile-info">
                        <div className="staff-students__profile-name">{selected.name}</div>
                        <div className="staff-students__profile-sub">
                          {selected.id}
                          <span className="staff-students__profile-dot">·</span>
                          <IconMail size={12} aria-hidden />
                          {selected.email}
                        </div>
                        {(profile?.profileTags ?? []).length > 0 && (
                          <div className="staff-students__profile-tags">
                            {profile?.profileTags.map((tag) => (
                              <span
                                key={tag.label}
                                className={`staff-students__badge ${profileTagClass(tag.type)}`}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="staff-students__profile-actions">
                        <button
                          type="button"
                          className="staff-students__p-btn"
                          onClick={handleSchedule}
                        >
                          <IconCalendarPlus size={13} aria-hidden />
                          Schedule
                        </button>
                        <button
                          type="button"
                          className="staff-students__p-btn staff-students__p-btn-primary"
                          onClick={handleNewTicket}
                        >
                          <IconTicket size={13} aria-hidden />
                          Ticket
                        </button>
                      </div>
                    </div>

                    {profileLoading && (
                      <p className="staff-students__empty staff-students__empty--inset">
                        Loading profile…
                      </p>
                    )}

                    <div className="staff-students__profile-stats">
                      <div className="staff-students__stat-pill">
                        <strong>{selected.stats.tickets}</strong>
                        <span>Open tickets</span>
                      </div>
                      <div className="staff-students__stat-pill amber">
                        <strong>{selected.stats.holds}</strong>
                        <span>Holds</span>
                      </div>
                      <div className="staff-students__stat-pill green">
                        <strong>{selected.stats.appts}</strong>
                        <span>Appts</span>
                      </div>
                      <div className="staff-students__stat-pill teal">
                        <strong className="staff-students__stat-text">
                          {selected.stats.nextAppointment}
                        </strong>
                        <span>Next appt</span>
                      </div>
                    </div>

                    <div className="staff-students__profile-body">
                      {profile && profile.holds.length > 0 && (
                        <section className="staff-students__section">
                          <h3 className="staff-students__section-title">Active holds</h3>
                          {profile.holds.map((hold) => (
                            <div className="staff-students__hold-row" key={hold.id}>
                              <IconCash size={14} color="#D97706" aria-hidden />
                              <div className="staff-students__hold-text">
                                <span className="staff-students__hold-title">{hold.title}</span>
                                <span className="staff-students__hold-sub">{hold.label}</span>
                              </div>
                              <span className="staff-students__badge staff-students__b-hold">
                                {hold.department}
                              </span>
                            </div>
                          ))}
                        </section>
                      )}

                      {profile && profile.tickets.length > 0 && (
                        <section className="staff-students__section">
                          <h3 className="staff-students__section-title">Tickets this semester</h3>
                          <div className="staff-students__ticket-table">
                            {profile.tickets.map((ticket) => (
                              <button
                                key={ticket.id}
                                type="button"
                                className="staff-students__ticket-row"
                                onClick={() =>
                                  navigate(`/staff-dashboard?ticket=${ticket.ticketNumber}`)
                                }
                              >
                                <span className="staff-students__ticket-id">{ticket.id}</span>
                                <span className="staff-students__ticket-concern">
                                  {ticket.concern}
                                </span>
                                <span
                                  className={`staff-students__badge ${ticketStatusClass(ticket.status)}`}
                                >
                                  {ticket.statusLabel}
                                </span>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      {profile && profile.healthNotes.length > 0 && (
                        <section className="staff-students__section">
                          <h3 className="staff-students__section-title">Health notes</h3>
                          <div className="staff-students__notes-panel">
                            {profile.healthNotes.map((note) => (
                              <div className="staff-students__health-note" key={note.text}>
                                <IconNotes size={13} color="#94a3b8" aria-hidden />
                                <span>{note.text}</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
