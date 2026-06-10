import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconSearch } from '@tabler/icons-react';
import {
  deleteAccount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateProfile,
  userInitials,
  type NotificationRecord,
  type User,
} from '../api/client';

type StudentTopbarProps = {
  user: User;
  onUserUpdated: (user: User) => void;
};

export function StudentTopbar({ user, onUserUpdated }: StudentTopbarProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

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
      if (profileOpen && menuRef.current && !menuRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
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
      onUserUpdated(updated);
      setEditOpen(false);
      setProfileOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account');
      setDeleting(false);
    }
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

  return (
    <>
      <div className="student-dashboard__topbar-right">
        <button
          type="button"
          className="student-dashboard__topbar-icon"
          aria-label="Search"
        >
          <IconSearch size={18} aria-hidden />
        </button>

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

          {notifOpen && (
            <div className="student-topbar__dropdown student-topbar__dropdown--wide">
              <div className="student-topbar__dropdown-header">
                <strong>Notifications</strong>
                {unreadCount > 0 && (
                  <button type="button" onClick={() => void handleMarkAllRead()}>
                    Mark all read
                  </button>
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
            </div>
          )}
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
            <div className="student-dashboard__user-avatar">
              {userInitials(user.name)}
            </div>
            <div className="student-dashboard__user-info">
              <div className="student-dashboard__user-name">{user.name}</div>
              <div className="student-dashboard__user-email">{user.email}</div>
            </div>
          </button>

          {profileOpen && (
            <div className="student-topbar__dropdown">
              <button
                type="button"
                onClick={() => {
                  setEditOpen(true);
                  setProfileOpen(false);
                }}
              >
                Edit details
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setDeleteOpen(true);
                  setProfileOpen(false);
                }}
              >
                Delete account
              </button>
            </div>
          )}
        </div>
      </div>

      {editOpen && (
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
        </div>
      )}

      {deleteOpen && (
        <div className="student-topbar__modal-overlay">
          <div className="student-topbar__modal" role="dialog" aria-modal="true">
            <h3>Delete account?</h3>
            <p>
              This permanently removes your profile, tickets, and chat history. This
              cannot be undone.
            </p>
            {error && <p className="student-topbar__error">{error}</p>}
            <div className="student-topbar__modal-actions">
              <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
