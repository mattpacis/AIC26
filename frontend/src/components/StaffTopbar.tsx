import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  IconBell,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import {
  getUserSettings,
  listNotifications,
  logout,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  updateProfile,
  updateUserSettings,
  userInitials,
  type NotificationRecord,
  type StaffDashboardUser,
  type UserSettings,
} from '../api/client';
import {
  getProfileTheme,
  PROFILE_THEMES,
  type ProfileTheme,
  type ProfileThemeId,
} from '../utils/profileTheme';
import { useNotificationToasts } from '../hooks/useNotificationToasts';
import { useAnchoredMenu } from '../hooks/useAnchoredMenu';
import '../components/StudentTopbar.css';
import './StaffTopbar.css';

type StaffTopbarProps = {
  user: StaffDashboardUser;
  profileTheme: ProfileTheme;
  onUserUpdated: (user: StaffDashboardUser) => void;
  onThemeUpdated: (theme: ProfileTheme) => void;
};

export function StaffTopbar({
  user,
  profileTheme,
  onUserUpdated,
  onThemeUpdated,
}: StaffTopbarProps) {
  useNotificationToasts(true);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileMenuStyle = useAnchoredMenu(profileOpen, menuRef);
  const notifMenuStyle = useAnchoredMenu(notifOpen, notifRef);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const data = await getUserSettings();
        if (!cancelled) {
          setSettings(data.settings);
        }
      } catch {
        if (!cancelled) {
          setSettings(null);
        }
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const data = await listNotifications();
        if (!cancelled) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        profileOpen &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !profileDropdownRef.current?.contains(target)
      ) {
        setProfileOpen(false);
      }
      if (
        notifOpen &&
        notifRef.current &&
        !notifRef.current.contains(target) &&
        !notifDropdownRef.current?.contains(target)
      ) {
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen, notifOpen]);

  async function handleSaveProfile() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await updateProfile(name.trim());
      onUserUpdated({
        ...user,
        name: updated.name,
        initials: userInitials(updated.name),
      });
      setEditOpen(false);
      setProfileOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeChange(themeId: ProfileThemeId) {
    if (savingTheme || settings?.profileTheme === themeId) return;
    setSavingTheme(true);
    try {
      const { settings: saved } = await updateUserSettings({ profileTheme: themeId });
      setSettings(saved);
      onThemeUpdated(getProfileTheme(saved.profileTheme));
    } catch {
      // Keep current theme on failure.
    } finally {
      setSavingTheme(false);
    }
  }

  async function handleToggleSetting(key: keyof UserSettings) {
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
    setProfileOpen(false);
    try {
      await logout();
    } catch {
      // Still return to login if logout fails.
    }
    navigate('/login');
  }

  async function handleMarkRead(notificationId: string) {
    const { notification } = await markNotificationRead(notificationId);
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? notification : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function handleMarkAllRead() {
    const data = await markAllNotificationsRead();
    setNotifications(data.notifications);
    setUnreadCount(0);
  }

  async function handleClearAll() {
    const data = await clearAllNotifications();
    setNotifications(data.notifications);
    setUnreadCount(0);
  }

  return (
    <>
      <div className="staff-dashboard__topbar-right">
        <div className="student-topbar__menu-wrap" ref={notifRef}>
          <button
            type="button"
            className="student-dashboard__topbar-icon"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((open) => !open);
              setProfileOpen(false);
            }}
          >
            <IconBell size={18} aria-hidden />
            {unreadCount > 0 && <span className="student-dashboard__notif-badge" />}
          </button>
        </div>

        <div className="student-topbar__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="student-dashboard__user-pill student-topbar__profile-btn"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotifOpen(false);
            }}
          >
            <div
              className="student-dashboard__user-avatar"
              style={{ background: profileTheme.bg, color: profileTheme.color }}
            >
              {user.initials}
            </div>
            <div className="student-dashboard__user-info">
              <div className="student-dashboard__user-name">{user.name}</div>
              <div className="student-dashboard__user-email">{user.email}</div>
            </div>
          </button>
        </div>
      </div>

      {portalTarget &&
        notifOpen &&
        createPortal(
          <div
            ref={notifDropdownRef}
            className="student-topbar__dropdown student-topbar__dropdown--wide student-topbar__dropdown--portal"
            style={notifMenuStyle}
          >
            <div className="student-topbar__dropdown-header">
              <strong>Notifications</strong>
              {notifications.length > 0 && (
                <div className="student-topbar__dropdown-actions">
                  {unreadCount > 0 && (
                    <button type="button" onClick={() => void handleMarkAllRead()}>
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="student-topbar__dropdown-action--muted"
                    onClick={() => void handleClearAll()}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="student-topbar__empty">No notifications yet.</p>
            ) : (
              <ul className="student-topbar__notif-list">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`student-topbar__notif-item${notification.read ? '' : ' unread'}`}
                      onClick={() => {
                        if (!notification.read) {
                          void handleMarkRead(notification.id);
                        }
                        if (notification.link) {
                          navigate(notification.link);
                          setNotifOpen(false);
                        }
                      }}
                    >
                      <strong>{notification.title}</strong>
                      <span>{notification.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          portalTarget,
        )}

      {portalTarget &&
        profileOpen &&
        createPortal(
          <div
            ref={profileDropdownRef}
            className="student-topbar__dropdown student-topbar__dropdown--profile student-topbar__dropdown--portal"
            style={profileMenuStyle}
          >
            <div className="student-topbar__dropdown-section">
              <span className="student-topbar__dropdown-label">Profile color</span>
              <div className="student-topbar__theme-swatches">
                {PROFILE_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`student-topbar__theme-swatch${
                      settings?.profileTheme === theme.id ? ' active' : ''
                    }`}
                    style={{ background: theme.bg }}
                    aria-label={theme.label}
                    aria-pressed={settings?.profileTheme === theme.id}
                    disabled={savingTheme}
                    onClick={() => void handleThemeChange(theme.id)}
                  />
                ))}
              </div>
            </div>

            <div className="student-topbar__dropdown-divider" />

            <button
              type="button"
              className="student-topbar__menu-item"
              onClick={() => {
                setEditOpen(true);
                setProfileOpen(false);
              }}
            >
              Edit details
            </button>
            <button
              type="button"
              className="student-topbar__menu-item"
              onClick={() => {
                setSettingsOpen(true);
                setProfileOpen(false);
              }}
            >
              <IconSettings size={15} aria-hidden />
              Settings
            </button>
            <button
              type="button"
              className="student-topbar__menu-item"
              onClick={() => void handleLogout()}
            >
              <IconLogout size={15} aria-hidden />
              Logout
            </button>
          </div>,
          portalTarget,
        )}

      {portalTarget &&
        editOpen &&
        createPortal(
          <div className="student-topbar__modal-overlay">
            <div className="student-topbar__modal" role="dialog" aria-modal="true">
              <h3>Edit profile</h3>
              <label>
                Full name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <p className="student-topbar__modal-note">Email: {user.email}</p>
              {error && <p className="student-topbar__error">{error}</p>}
              <div className="student-topbar__modal-actions">
                <button type="button" onClick={() => setEditOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="button" onClick={() => void handleSaveProfile()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>,
          portalTarget,
        )}

      {portalTarget &&
        settingsOpen &&
        settings &&
        createPortal(
          <div className="student-topbar__modal-overlay">
            <div className="student-topbar__modal" role="dialog" aria-modal="true">
              <h3>Settings</h3>
              <div className="staff-topbar__settings-row">
                <div>
                  <strong>Email notifications</strong>
                  <p className="student-topbar__modal-note">
                    Receive updates when ticket status changes.
                  </p>
                </div>
                <button
                  type="button"
                  className={`staff-topbar__toggle${settings.emailNotifications ? ' on' : ''}`}
                  role="switch"
                  aria-checked={settings.emailNotifications}
                  onClick={() => void handleToggleSetting('emailNotifications')}
                  disabled={saving}
                />
              </div>
              <div className="staff-topbar__settings-row">
                <div>
                  <strong>Appointment reminders</strong>
                  <p className="student-topbar__modal-note">
                    Get reminders before scheduled appointments.
                  </p>
                </div>
                <button
                  type="button"
                  className={`staff-topbar__toggle${settings.appointmentReminders ? ' on' : ''}`}
                  role="switch"
                  aria-checked={settings.appointmentReminders}
                  onClick={() => void handleToggleSetting('appointmentReminders')}
                  disabled={saving}
                />
              </div>
              <div className="student-topbar__modal-actions">
                <button type="button" onClick={() => setSettingsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
}
