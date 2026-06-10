import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconLogout,
  IconMail,
  IconSettings,
} from '@tabler/icons-react';
import { listStaffDirectory, type StaffDirectoryMember } from '../api/client';
import { StaffNotifications } from '../components/StaffNotifications';
import { useShellScale } from '../hooks/useShellScale';
import { useStaffShell } from '../hooks/useStaffShell';
import './StaffDashboard.css';
import './StaffDirectory.css';

export function StaffDirectory() {
  const navigate = useNavigate();
  const { outerRef, shellRef } = useShellScale({ mobileBreakpoint: 1100 });
  const { staffUser, navItems, handleLogout } = useStaffShell();
  const [members, setMembers] = useState<StaffDirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listStaffDirectory();
        if (!cancelled) {
          setMembers(data.members);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load directory');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const departmentLabel = staffUser?.department ?? 'Department';

  return (
    <div className="staff-dashboard staff-directory">
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
                      <span className="staff-dashboard__nav-badge amber">
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
                {departmentLabel} — Directory
              </div>
              <StaffNotifications />
            </header>

            <div className="staff-directory__content">
              {error && <p className="staff-directory__error">{error}</p>}
              {loading ? (
                <p className="staff-directory__empty">Loading directory…</p>
              ) : members.length === 0 ? (
                <p className="staff-directory__empty">No staff members found.</p>
              ) : (
                <div className="staff-directory__grid">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className={`staff-directory__card${member.isSelf ? ' self' : ''}`}
                    >
                      <div className="staff-directory__avatar">{member.initials}</div>
                      <div className="staff-directory__info">
                        <div className="staff-directory__name">
                          {member.name}
                          {member.isSelf && (
                            <span className="staff-directory__you">You</span>
                          )}
                        </div>
                        <div className="staff-directory__dept">{member.department}</div>
                        <a
                          className="staff-directory__email"
                          href={`mailto:${member.email}`}
                        >
                          <IconMail size={13} aria-hidden />
                          {member.email}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
