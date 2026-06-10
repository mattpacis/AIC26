import {
  IconBooks,
  IconBuilding,
  IconCash,
  IconCertificate,
  IconHeartRateMonitor,
  IconPrinter,
  IconSchool,
  IconUserCircle,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';

export type QuickLink = {
  label: string;
  icon: TablerIcon;
  iconColor: string;
  bgColor: string;
  url?: string;
};

export const QUICK_LINKS: QuickLink[] = [
  {
    label: 'AISIS',
    icon: IconSchool,
    iconColor: '#2563EB',
    bgColor: '#EFF6FF',
    url: 'https://aisis.ateneo.edu',
  },
  {
    label: 'Canvas',
    icon: IconCertificate,
    iconColor: '#D97706',
    bgColor: '#FEF3C7',
    url: 'https://canvas.ateneo.edu',
  },
  {
    label: 'BluePHR',
    icon: IconHeartRateMonitor,
    iconColor: '#059669',
    bgColor: '#ECFDF5',
    url: 'https://ateneo.bluphr.ph',
  },
  { label: 'Library', icon: IconBooks, iconColor: '#374151', bgColor: '#F3F4F6' },
  { label: 'Printing', icon: IconPrinter, iconColor: '#9333EA', bgColor: '#FDF4FF' },
  { label: 'Facilities', icon: IconBuilding, iconColor: '#EA580C', bgColor: '#FFF7ED' },
  { label: 'Cashier', icon: IconCash, iconColor: '#0369A1', bgColor: '#EFF6FF' },
  { label: 'Registrar', icon: IconUserCircle, iconColor: '#DB2777', bgColor: '#FDF2F8' },
];

export function openCampusPortal(url: string, title: string) {
  const width = Math.min(1200, window.screen.availWidth - 48);
  const height = Math.min(820, window.screen.availHeight - 48);
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  const windowName = `campus360-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;

  const popup = window.open(url, windowName, features);

  if (!popup) {
    window.open(url, '_blank');
    return;
  }

  popup.focus();
}
