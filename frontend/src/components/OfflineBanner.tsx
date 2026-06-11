import { useEffect, useState } from 'react';
import { IconWifiOff } from '@tabler/icons-react';
import './OfflineBanner.css';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setOffline(false);
    }
    function handleOffline() {
      setOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="c360-offline" role="status">
      <IconWifiOff size={16} aria-hidden />
      You&apos;re offline — changes will sync when you reconnect.
    </div>
  );
}
