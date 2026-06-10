import {
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
  { label: 'Quick Links', icon: IconLink, path: '/quick-links' },
];

export function getStudentNavItems(pathname: string): StudentNavItem[] {
  return BASE_NAV.map((item) => ({
    ...item,
    active:
      item.label === 'AI Helpdesk'
        ? pathname === '/dashboard'
        : item.label === 'My Tickets'
          ? pathname === '/tickets' || pathname.startsWith('/tickets/')
          : item.label === 'Appointments'
            ? pathname === '/appointments'
            : item.label === 'Quick Links'
              ? pathname === '/quick-links'
              : false,
  }));
}
