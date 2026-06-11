export function formatRelativeTime(isoOrDate: string | Date, now = new Date()) {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const ms = now.getTime() - date.getTime();
  if (!Number.isFinite(ms)) return '—';

  const sec = Math.round(ms / 1000);
  if (sec < 45) return 'Just now';
  if (sec < 90) return '1 min ago';

  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;

  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr${hr === 1 ? '' : 's'} ago`;

  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
