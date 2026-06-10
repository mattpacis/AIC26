import {
  IconAlertCircle,
  IconBook,
  IconCalendarEvent,
  IconLink,
  IconMessageChatbot,
  IconTicket,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';

export type StudentNavItem = {
  label: string;
  icon: TablerIcon;
  path: string;
  badge?: number;
  active?: boolean;
};

const BASE_NAV: Omit<StudentNavItem, 'active'>[] = [
  { label: 'AI Helpdesk', icon: IconMessageChatbot, path: '/dashboard' },
  { label: 'My Tickets', icon: IconTicket, path: '/tickets' },
  { label: 'Appointments', icon: IconCalendarEvent, path: '/appointments' },
  { label: 'Holds', icon: IconAlertCircle, path: '/holds' },
  { label: 'Quick Links', icon: IconLink, path: '/dashboard' },
  { label: 'Handbook', icon: IconBook, path: '/dashboard' },
];

export function getStudentNavItems(
  pathname: string,
  options: { holdsCount?: number } = {},
): StudentNavItem[] {
  return BASE_NAV.map((item) => ({
    ...item,
    badge:
      item.label === 'Holds' && options.holdsCount && options.holdsCount > 0
        ? options.holdsCount
        : item.badge,
    active:
      item.label === 'AI Helpdesk'
        ? pathname === '/dashboard'
        : item.label === 'My Tickets'
          ? pathname === '/tickets' || pathname.startsWith('/tickets/')
          : item.label === 'Appointments'
            ? pathname === '/appointments'
            : item.label === 'Holds'
              ? pathname === '/holds'
              : false,
  }));
}
