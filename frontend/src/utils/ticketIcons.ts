import {
  IconCalendarCheck,
  IconCash,
  IconCertificate,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconFileCertificate,
  IconWifiOff,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';

const TRACK_STEP_ICONS: Record<string, TablerIcon> = {
  check: IconCheck,
  clock: IconClock,
  'calendar-check': IconCalendarCheck,
  certificate: IconFileCertificate,
  'circle-check': IconCircleCheck,
  cash: IconCash,
};

const RELATED_ICONS: Record<string, { icon: TablerIcon; color: string }> = {
  wifi: { icon: IconWifiOff, color: '#2563EB' },
  cash: { icon: IconCash, color: '#d97706' },
  certificate: { icon: IconCertificate, color: '#059669' },
};

export function getTrackStepIcon(name?: string): TablerIcon {
  return TRACK_STEP_ICONS[name ?? 'clock'] ?? IconClock;
}

export function getRelatedTicketIcon(name?: string) {
  return RELATED_ICONS[name ?? 'certificate'] ?? {
    icon: IconCertificate,
    color: '#2563EB',
  };
}
