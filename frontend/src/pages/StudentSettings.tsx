import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMe,
  getUserSettings,
  updateUserSettings,
  type User,
  type UserSettings,
} from '../api/client';
import { StudentSidebar } from '../components/StudentSidebar';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { Skeleton, SkeletonBlock } from '../components/Skeleton';
import { useShellScale } from '../hooks/useShellScale';
import { randomGreeting } from '../utils/greeting';
import { usePageTitle } from '../hooks/usePageTitle';
import { PROFILE_THEMES, type ProfileThemeId } from '../utils/profileTheme';
import './StudentDashboard.css';
import './StudentSettings.css';

export function StudentSettings() {
  const navigate = useNavigate();
  usePageTitle('Settings');
  const { outerRef, shellRef } = useShellScale();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);

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

  async function handleThemeChange(themeId: ProfileThemeId) {
    if (!settings || savingTheme || settings.profileTheme === themeId) return;
    const previous = settings;
    setSettings({ ...settings, profileTheme: themeId });
    setSavingTheme(true);
    try {
      const { settings: saved } = await updateUserSettings({ profileTheme: themeId });
      setSettings(saved);
    } catch {
      setSettings(previous);
    } finally {
      setSavingTheme(false);
    }
  }

  if (loading || !user || !settings) {
    return (
      <div className="student-dashboard">
        <div className="student-dashboard__outer" ref={outerRef}>
          <div className="student-dashboard__shell" ref={shellRef}>
            <aside className="student-dashboard__sidebar">
              <div className="student-dashboard__sidebar-logo">
                <Skeleton width={120} height={20} />
              </div>
            </aside>
            <div className="student-dashboard__main">
              <header className="student-dashboard__topbar">
                <Skeleton width={160} height={18} />
              </header>
              <div className="student-settings__content">
                <Skeleton width={120} height={28} />
                <div className="student-dashboard__card student-settings__card">
                  <SkeletonBlock lines={3} />
                </div>
                <div className="student-dashboard__card student-settings__card">
                  <SkeletonBlock lines={4} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayGreeting = greeting;

  return (
    <div className="student-dashboard">
      <div className="student-dashboard__outer" ref={outerRef}>
        <div className="student-dashboard__shell" ref={shellRef}>
          <StudentSidebar />

          <div className="student-dashboard__main">
            <header className="student-dashboard__topbar">
              <div className="student-dashboard__topbar-left">
                <span className="student-dashboard__greeting">{displayGreeting}</span>
              </div>
              <StudentTopbar user={user} onUserUpdated={setUser} />
            </header>

            <div className="student-settings__content">
              <h1 className="student-settings__title">Settings</h1>

              <div className="student-dashboard__card student-settings__card c360-stagger" style={{ '--c360-stagger': 0 } as CSSProperties}>
                <div className="student-settings__row student-settings__row--theme">
                  <div>
                    <div className="student-settings__label">Profile color</div>
                    <div className="student-settings__hint">
                      Choose the color for your avatar across Campus360.
                    </div>
                  </div>
                  <div className="student-settings__theme-swatches">
                    {PROFILE_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        className={`student-settings__theme-swatch${
                          settings.profileTheme === theme.id ? ' active' : ''
                        }`}
                        style={{ background: theme.bg }}
                        aria-label={theme.label}
                        aria-pressed={settings.profileTheme === theme.id}
                        disabled={savingTheme}
                        onClick={() => void handleThemeChange(theme.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="student-dashboard__card student-settings__card c360-stagger" style={{ '--c360-stagger': 1 } as CSSProperties}>
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
