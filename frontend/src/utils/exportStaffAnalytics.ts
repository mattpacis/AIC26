import type { StaffAnalytics } from '../api/client';

function csvEscape(value: string | number | null | undefined) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function exportStaffAnalyticsCsv(analytics: StaffAnalytics, department: string) {
  const rows: string[][] = [
    ['Campus360 Analytics Export'],
    ['Department', department],
    ['Generated', new Date().toLocaleString()],
    [],
    ['Metric', 'Value'],
    ['Open queue', String(analytics.summary.queueCount)],
    ['Action needed', String(analytics.summary.openCount)],
    ['In progress', String(analytics.summary.progressCount)],
    ['Scheduled', String(analytics.summary.scheduledCount)],
    ['Resolved', String(analytics.summary.resolvedCount)],
    ['Resolved this week', String(analytics.summary.resolvedThisWeek)],
    [],
    ['Urgency', 'Count'],
    ['Low', String(analytics.urgency.low)],
    ['Medium', String(analytics.urgency.medium)],
    ['High', String(analytics.urgency.high)],
    [],
    ['Status', 'Count'],
    ...analytics.statusBreakdown.map((row) => [row.label, String(row.count)]),
  ];

  const csv = rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `campus360-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
