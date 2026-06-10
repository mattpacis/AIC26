import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell } from '@tabler/icons-react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '../api/client';
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
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      if (open && notifRef.current && !notifRef.current.contains(event.target as Node)) {
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

  return (
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

      {open && (
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
        </div>
      )}
    </div>
  );
}
