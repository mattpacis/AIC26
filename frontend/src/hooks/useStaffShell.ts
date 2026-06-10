import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TablerIcon } from '@tabler/icons-react';
import {
  IconAddressBook,
  IconCalendarEvent,
  IconChartBar,
  IconLayoutDashboard,
  IconUsers,
} from '@tabler/icons-react';
import {
  getStaffDashboard,
  logout,
  type StaffDashboardSummary,
  type StaffDashboardUser,
} from '../api/client';

export type StaffNavItem = {
  label: string;
  icon: TablerIcon;
  path: string;
  active?: boolean;
  badge?: number;
  badgeAmber?: number;
};

function buildNav(
  pathname: string,
  summary: StaffDashboardSummary | null,
): StaffNavItem[] {
  return [
    {
      label: 'Dashboard',
      icon: IconLayoutDashboard,
      path: '/staff-dashboard',
      active: pathname === '/staff-dashboard',
      badge: summary?.queueCount,
    },
    {
      label: 'Appointments',
      icon: IconCalendarEvent,
      path: '/staff/appointments',
      active: pathname === '/staff/appointments',
      badgeAmber: summary?.todayAppointmentCount,
    },
    {
      label: 'Students',
      icon: IconUsers,
      path: '/staff/students',
      active: pathname === '/staff/students',
    },
    {
      label: 'Directory',
      icon: IconAddressBook,
      path: '/staff/directory',
      active: pathname === '/staff/directory',
    },
    {
      label: 'Analytics',
      icon: IconChartBar,
      path: '/staff/analytics',
      active: pathname === '/staff/analytics',
    },
  ];
}

export function useStaffShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [staffUser, setStaffUser] = useState<StaffDashboardUser | null>(null);
  const [summary, setSummary] = useState<StaffDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const loadShell = useCallback(async () => {
    try {
      const data = await getStaffDashboard();
      setStaffUser(data.user);
      setSummary(data.summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff session');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadShell();
  }, [loadShell]);

  const navItems = buildNav(pathname, summary);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Still send the user back to login if logout fails.
    }
    navigate('/login');
  }

  return {
    staffUser,
    summary,
    navItems,
    loading,
    error,
    handleLogout,
    refreshShell: loadShell,
  };
}
