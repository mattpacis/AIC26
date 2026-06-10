import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconAlertTriangle,
  IconBuildingCommunity,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import { getHoldSummary, getMe, logout, userInitials, type User } from '../api/client';
import { getStudentNavItems } from '../config/studentNav';
import { useShellScale } from '../hooks/useShellScale';
import './StudentDashboard.css';
import './StudentTicketDetail.css';
import './StudentHolds.css';

export function StudentHolds() {
  const navigate = useNavigate();
  const location = useLocation();
  const { outerRef, shellRef } = useShellScale();

  const [user, setUser] = useState<User | null>(null);
  const [holds, setHolds] = useState<
    Awaited<ReturnType<typeof getHoldSummary>>['summary']['holds']
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHolds() {
      try {
        const [me, summaryData] = await Promise.all([getMe(), getHoldSummary()]);
        if (cancelled) return;
        setUser(me.user);
        setHolds(summaryData.summary.holds);
      } catch {
        if (!cancelled) {
          navigate('/login');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHolds();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const navItems = getStudentNavItems(location.pathname, {
    holdsCount: holds.length,
  });

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

  const displayUser = user
    ? {
        initials: userInitials(user.name),
        name: user.name,
        email: user.email,
      }
    : null;

  return (
    <div className="student-holds">
      <h2 className="student-ticket-detail__sr-only">
        Campus360 active holds page listing tuition and registrar holds
      </h2>

      <div className="student-ticket-detail__outer" ref={outerRef}>
        <div className="student-ticket-detail__shell" ref={shellRef}>
          <aside className="student-ticket-detail__sidebar">
            <div className="student-ticket-detail__sb-logo">
              <div className="student-ticket-detail__sb-logo-icon">
                <IconBuildingCommunity size={20} aria-hidden />
              </div>
              <span className="student-ticket-detail__sb-logo-text">Campus360</span>
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
                    <span className="student-ticket-detail__nav-badge">{badge}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="student-ticket-detail__sb-footer">
              <button type="button" className="student-ticket-detail__nav-item">
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
              <div className="student-holds__topbar-title">
                <IconAlertTriangle size={18} color="#D97706" aria-hidden />
                Active Holds
              </div>
              {displayUser && (
                <div className="student-tickets__user-pill">
                  <div className="student-tickets__user-avatar">
                    {displayUser.initials}
                  </div>
                  <div>
                    <div className="student-tickets__user-name">{displayUser.name}</div>
                    <div className="student-tickets__user-email">{displayUser.email}</div>
                  </div>
                </div>
              )}
            </header>

            <div className="student-holds__content">
              {loading ? (
                <p className="student-holds__empty">Loading holds…</p>
              ) : holds.length === 0 ? (
                <p className="student-holds__empty">
                  You have no active holds right now.
                </p>
              ) : (
                holds.map((hold) => (
                  <div key={hold.id} className="student-holds__card">
                    <div className="student-holds__card-title">
                      <span className="student-dashboard__notification-dot" />
                      {hold.label}
                    </div>
                    <div className="student-holds__card-meta">{hold.department}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
