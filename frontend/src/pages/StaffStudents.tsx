import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconCalendarPlus,
  IconCash,
  IconDownload,
  IconLogout,
  IconMail,
  IconNotes,
  IconPlus,
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

type FilterKey =
  | 'all'
  | 'holds'
  | 'health-flags'
  | 'open-tickets'
  | '2nd-year'
  | 'cs';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'holds', label: 'With holds' },
  { key: 'health-flags', label: 'Health flags' },
  { key: 'open-tickets', label: 'Open tickets' },
  { key: '2nd-year', label: '2nd Year' },
  { key: 'cs', label: 'CS' },
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
    case '2nd-year':
      return { yearLevel: '2nd' };
    case 'cs':
      return { program: 'Computer Science' };
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
    student.email.toLowerCase().includes(q) ||
    (student.program ?? '').toLowerCase().includes(q)
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
              <div className="staff-students__topbar-title">Students — Directory</div>
              <div className="staff-students__topbar-right">
                <button type="button" className="staff-students__tb-btn">
                  <IconDownload size={14} aria-hidden />
                  Export
                </button>
                <button
                  type="button"
                  className="staff-students__tb-btn staff-students__tb-btn-primary"
                >
                  <IconPlus size={14} aria-hidden />
                  Add student record
                </button>
                <StaffNotifications
                  buttonClassName="staff-students__tb-icon"
                  dotClassName="staff-students__notif-dot"
                />
              </div>
            </header>

            {error && <div style={{ padding: 16 }}>{error}</div>}

            <div className="staff-students__content">
              <div className="staff-students__list-col">
                <div className="staff-students__list-header">
                  <div className="staff-students__search-wrap">
                    <span className="staff-students__search-icon">
                      <IconSearch size={16} aria-hidden />
                    </span>
                    <input
                      className="staff-students__search-input"
                      placeholder="Search by name, ID, or email…"
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
                </div>

                <div className="staff-students__list-meta">
                  Showing {filteredStudents.length} students · {departmentLabel} dept.
                  view
                </div>

                <div className="staff-students__student-list">
                  {loading && (
                    <div style={{ padding: 16, color: '#64748b' }}>Loading students…</div>
                  )}
                  {!loading && filteredStudents.length === 0 && (
                    <div style={{ padding: 16, color: '#64748b' }}>
                      No students match this filter.
                    </div>
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
                          <div className="staff-students__stu-name">{student.name}</div>
                          <div className="staff-students__stu-sub">{student.sub}</div>
                          <div className="staff-students__stu-tags">
                            {student.listTags.map((tag) => (
                              <span
                                key={tag.label}
                                className={`staff-students__badge ${listTagClass(tag.type)}`}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="staff-students__profile-col">
                {!selected ? (
                  <div className="staff-students__profile-card" style={{ padding: 24 }}>
                    Select a student from the list.
                  </div>
                ) : (
                  <div className="staff-students__profile-card">
                    {profileLoading && (
                      <div style={{ padding: 16, color: '#64748b' }}>
                        Loading profile…
                      </div>
                    )}
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
                        <div className="staff-students__profile-name">
                          {selected.name}
                        </div>
                        <div className="staff-students__profile-sub">
                          {selected.sub}
                        </div>
                        <div className="staff-students__profile-contact">
                          <span>
                            <IconMail size={13} aria-hidden /> {selected.email}
                          </span>
                          {selected.phone && <span>{selected.phone}</span>}
                        </div>
                        <div className="staff-students__profile-tags">
                          {(profile?.profileTags ?? []).map((tag) => (
                            <span
                              key={tag.label}
                              className={`staff-students__badge ${profileTagClass(tag.type)}`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="staff-students__profile-actions">
                        <button type="button" className="staff-students__p-btn">
                          <IconCalendarPlus size={13} aria-hidden />
                          Schedule
                        </button>
                        <button type="button" className="staff-students__p-btn">
                          <IconTicket size={13} aria-hidden />
                          New ticket
                        </button>
                      </div>
                    </div>

                    <div className="staff-students__profile-stats">
                      <div className="staff-students__profile-stat">
                        <div className="staff-students__profile-stat-num">
                          {selected.stats.tickets}
                        </div>
                        <div className="staff-students__profile-stat-label">
                          Open
                          <br />
                          tickets
                        </div>
                      </div>
                      <div className="staff-students__profile-stat">
                        <div className="staff-students__profile-stat-num amber">
                          {selected.stats.holds}
                        </div>
                        <div className="staff-students__profile-stat-label">
                          Active
                          <br />
                          holds
                        </div>
                      </div>
                      <div className="staff-students__profile-stat">
                        <div className="staff-students__profile-stat-num green">
                          {selected.stats.appts}
                        </div>
                        <div className="staff-students__profile-stat-label">
                          Upcoming
                          <br />
                          appts
                        </div>
                      </div>
                    </div>

                    <div className="staff-students__info-grid">
                      <div className="staff-students__info-card">
                        <div className="staff-students__info-label">Program</div>
                        <div className="staff-students__info-value-sm">
                          {selected.program ?? '—'}
                        </div>
                      </div>
                      <div className="staff-students__info-card">
                        <div className="staff-students__info-label">Year level</div>
                        <div className="staff-students__info-value-sm">
                          {selected.yearLevel ?? '—'}
                        </div>
                      </div>
                      <div className="staff-students__info-card">
                        <div className="staff-students__info-label">College</div>
                        <div className="staff-students__info-value-sm">
                          {selected.college ?? '—'}
                        </div>
                      </div>
                      <div className="staff-students__info-card">
                        <div className="staff-students__info-label">Enrollment status</div>
                        <div
                          className={`staff-students__info-value-sm${selected.enrollmentWarn ? ' staff-students__info-value-warn' : ''}`}
                        >
                          {selected.enrollmentStatus}
                        </div>
                      </div>
                      <div className="staff-students__info-card">
                        <div className="staff-students__info-label">
                          Next appointment
                        </div>
                        <div className="staff-students__info-value-sm staff-students__info-value-teal">
                          {selected.stats.nextAppointment}
                        </div>
                      </div>
                    </div>

                    {profile && profile.holds.length > 0 && (
                      <>
                        <div className="staff-students__section-sep">Active holds</div>
                        {profile.holds.map((hold) => (
                          <div className="staff-students__hold-card" key={hold.id}>
                            <div className="staff-students__hold-icon">
                              <IconCash size={14} color="#D97706" aria-hidden />
                            </div>
                            <div>
                              <div className="staff-students__hold-title">{hold.title}</div>
                              <div className="staff-students__hold-sub">{hold.label}</div>
                            </div>
                            <span
                              className="staff-students__badge staff-students__b-hold"
                              style={{ marginLeft: 'auto' }}
                            >
                              {hold.department}
                            </span>
                          </div>
                        ))}
                      </>
                    )}

                    {profile && profile.tickets.length > 0 && (
                      <>
                        <div className="staff-students__section-sep">
                          Tickets this semester
                        </div>
                        {profile.tickets.map((ticket) => (
                          <button
                            key={ticket.id}
                            type="button"
                            className="staff-students__ticket-row"
                            onClick={() => navigate('/staff-dashboard')}
                          >
                            <span className="staff-students__ticket-id">{ticket.id}</span>
                            <span className="staff-students__ticket-concern">
                              {ticket.concern}
                            </span>
                            <span className="staff-students__ticket-dept">
                              {ticket.department}
                            </span>
                            <span
                              className={`staff-students__badge ${ticketStatusClass(ticket.status)}`}
                            >
                              {ticket.statusLabel}
                            </span>
                          </button>
                        ))}
                      </>
                    )}

                    {profile && profile.healthNotes.length > 0 && (
                      <>
                        <div className="staff-students__section-sep">Health record notes</div>
                        <div className="staff-students__health-panel">
                          {profile.healthNotes.map((note) => (
                            <div className="staff-students__health-note" key={note.text}>
                              <IconNotes size={14} color="#9ca3af" aria-hidden />
                              <span>{note.text}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {profile && profile.healthNotes.length === 0 && (
                      <>
                        <div className="staff-students__section-sep">Health record notes</div>
                        <div className="staff-students__health-panel">
                          <div className="staff-students__health-note">
                            <IconNotes size={14} color="#9ca3af" aria-hidden />
                            <span>No health flags on file.</span>
                          </div>
                        </div>
                      </>
                    )}
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
