import { useLocation, useNavigate } from 'react-router-dom';
import { IconLogout, IconSettings } from '@tabler/icons-react';
import { logout } from '../api/client';
import { Campus360Logo } from './Campus360Logo';
import { getStudentNavItems } from '../config/studentNav';
import '../pages/StudentDashboard.css';

export function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = getStudentNavItems(location.pathname);
  const settingsActive = location.pathname === '/settings';

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Still return to login if logout fails.
    }
    navigate('/login');
  }

  return (
    <aside className="student-dashboard__sidebar">
      <div className="student-dashboard__sidebar-logo">
        <Campus360Logo variant="sidebar" />
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
          className={`student-dashboard__nav-item${settingsActive ? ' active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <IconSettings size={17} aria-hidden />
          Settings
        </button>
        <button
          type="button"
          className="student-dashboard__nav-item student-dashboard__nav-item--logout"
          onClick={() => void handleLogout()}
        >
          <IconLogout size={17} aria-hidden />
          Log out
        </button>
      </div>
    </aside>
  );
}
