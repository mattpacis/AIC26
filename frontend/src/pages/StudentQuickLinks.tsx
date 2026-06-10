import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconLink,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import { getMe, logout, type User } from '../api/client';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { getStudentNavItems } from '../config/studentNav';
import { openCampusPortal, QUICK_LINKS } from '../config/quickLinks';
import { useShellScale } from '../hooks/useShellScale';
import { randomGreeting } from '../utils/greeting';
import './StudentDashboard.css';
import './StudentQuickLinks.css';

export function StudentQuickLinks() {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = getStudentNavItems(location.pathname);
  const { outerRef, shellRef } = useShellScale();
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me.user);
        setGreeting(randomGreeting(me.user.name.split(' ')[0]));
      } catch {
        if (!cancelled) {
          navigate('/login');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Still send the user back to login if logout fails.
    }
    navigate('/login');
  }

  if (!user) {
    return null;
  }

  return (
    <div className="student-dashboard">
      <div className="student-dashboard__outer" ref={outerRef}>
        <div className="student-dashboard__shell" ref={shellRef}>
          <aside className="student-dashboard__sidebar">
            <div className="student-dashboard__sidebar-logo">
              <div className="student-dashboard__logo-icon">
                <IconBuildingCommunity size={20} aria-hidden />
              </div>
              <span className="student-dashboard__logo-text">Campus360</span>
            </div>

            <nav className="student-dashboard__sidebar-nav">
              {navItems.map(({ label, icon: Icon, path, active, badge }) => (
                <button
                  key={label}
                  type="button"
                  className={`student-dashboard__nav-item${active ? ' active' : ''}`}
                  onClick={() => path && navigate(path)}
                >
                  <Icon size={17} aria-hidden />
                  {label}
                  {badge !== undefined && (
                    <span className="student-dashboard__nav-badge">{badge}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="student-dashboard__sidebar-footer">
              <button
                type="button"
                className="student-dashboard__nav-item"
                onClick={() => navigate('/settings')}
              >
                <IconSettings size={17} aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="student-dashboard__nav-item"
                onClick={handleLogout}
              >
                <IconLogout size={17} aria-hidden />
                Logout
              </button>
            </div>
          </aside>

          <div className="student-dashboard__main">
            <header className="student-dashboard__topbar">
              <div className="student-dashboard__topbar-left">{greeting}</div>
              <StudentTopbar user={user} onUserUpdated={setUser} />
            </header>

            <div className="student-quicklinks__content">
              <h1 className="student-quicklinks__title">
                <IconLink size={22} aria-hidden />
                Quick Links
              </h1>
              <div className="student-quicklinks__grid">
                {QUICK_LINKS.map(({ label, icon: Icon, iconColor, bgColor, url }) => (
                  <button
                    key={label}
                    type="button"
                    className="student-quicklinks__card"
                    onClick={() => {
                      if (url) {
                        openCampusPortal(url, label);
                      }
                    }}
                  >
                    <span
                      className="student-quicklinks__icon"
                      style={{ background: bgColor }}
                    >
                      <Icon size={22} color={iconColor} aria-hidden />
                    </span>
                    <span className="student-quicklinks__label">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
