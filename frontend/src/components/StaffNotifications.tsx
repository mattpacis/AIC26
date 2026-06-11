import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { IconBell } from '@tabler/icons-react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  type NotificationRecord,
} from '../api/client';
import { useAnchoredMenu } from '../hooks/useAnchoredMenu';
import '../components/StudentTopbar.css';

type StaffNotificationsProps = {
  buttonClassName?: string;
  dotClassName?: string;
};

export function StaffNotifications({
  buttonClassName = 'staff-dashboard__tb-icon',
  dotClassName = 'staff-dashboard__notif-dot',
}: StaffNotificationsProps) {
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifMenuStyle = useAnchoredMenu(open, notifRef);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        open &&
        notifRef.current &&
        !notifRef.current.contains(target) &&
        !notifDropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

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
      <div className="student-topbar__menu-wrap" ref={notifRef}>
        <button
          type="button"
          className={buttonClassName}
          aria-label="Notifications"
          onClick={() => setOpen((value) => !value)}
        >
          <IconBell size={17} aria-hidden />
          {unreadCount > 0 && <span className={dotClassName} />}
        </button>
      </div>

      {portalTarget &&
        open &&
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
                          setOpen(false);
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
    </>
  );
}
