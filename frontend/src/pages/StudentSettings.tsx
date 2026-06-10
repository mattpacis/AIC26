import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import {
  getMe,
  getUserSettings,
  logout,
  updateUserSettings,
  type User,
  type UserSettings,
} from '../api/client';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { getStudentNavItems } from '../config/studentNav';
import { useShellScale } from '../hooks/useShellScale';
import { randomGreeting } from '../utils/greeting';
import './StudentDashboard.css';
import './StudentSettings.css';

export function StudentSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = getStudentNavItems(location.pathname);
  const { outerRef, shellRef } = useShellScale();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [me, settingsData] = await Promise.all([getMe(), getUserSettings()]);
        if (cancelled) return;
        setUser(me.user);
        setSettings(settingsData.settings);
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

  async function handleToggle(key: keyof UserSettings) {
    if (!settings || saving) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    try {
      const { settings: saved } = await updateUserSettings({ [key]: next[key] });
      setSettings(saved);
    } catch {
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Still send the user back to login if logout fails.
    }
    navigate('/login');
  }

  if (!user || !settings) {
    return null;
  }

  const displayGreeting = greeting;

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
                className="student-dashboard__nav-item active"
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
              <div className="student-dashboard__topbar-left">{displayGreeting}</div>
              <StudentTopbar user={user} onUserUpdated={setUser} />
            </header>

            <div className="student-settings__content">
              <h1 className="student-settings__title">Settings</h1>

              <div className="student-dashboard__card student-settings__card">
                <div className="student-settings__row">
                  <div>
                    <div className="student-settings__label">Email notifications</div>
                    <div className="student-settings__hint">
                      Receive updates when ticket status changes.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`student-settings__toggle${settings.emailNotifications ? ' on' : ''}`}
                    role="switch"
                    aria-checked={settings.emailNotifications}
                    onClick={() => void handleToggle('emailNotifications')}
                    disabled={saving}
                  />
                </div>

                <div className="student-settings__row">
                  <div>
                    <div className="student-settings__label">Appointment reminders</div>
                    <div className="student-settings__hint">
                      Get reminders before scheduled appointments.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`student-settings__toggle${settings.appointmentReminders ? ' on' : ''}`}
                    role="switch"
                    aria-checked={settings.appointmentReminders}
                    onClick={() => void handleToggle('appointmentReminders')}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
