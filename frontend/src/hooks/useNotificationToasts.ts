import { useEffect, useRef } from 'react';
import { listNotifications, type NotificationRecord } from '../api/client';
import { useToast } from '../components/ToastProvider';

export function useNotificationToasts(enabled = true) {
  const { pushToast } = useToast();
  const seenIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function poll() {
      try {
        const data = await listNotifications();
        if (cancelled) return;

        if (!bootstrapped.current) {
          data.notifications.forEach((item) => seenIds.current.add(item.id));
          bootstrapped.current = true;
          return;
        }

        const fresh = data.notifications.filter(
          (item) => !item.read && !seenIds.current.has(item.id),
        );

        fresh.forEach((item: NotificationRecord) => {
          seenIds.current.add(item.id);
          pushToast({
            title: item.title,
            body: item.body,
            tone: 'info',
          });
        });
      } catch {
        // ignore polling errors
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void poll();
      }
    }, 30000);

    function handleFocus() {
      void poll();
    }
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, pushToast]);
}
