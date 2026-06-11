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
  getUserSettings,
  logout,
  type StaffDashboardSummary,
  type StaffDashboardUser,
} from '../api/client';
import {
  getProfileTheme,
  type ProfileTheme,
  type ProfileThemeId,
} from '../utils/profileTheme';

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
  const [profileTheme, setProfileTheme] = useState<ProfileTheme>(
    getProfileTheme('blue'),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const loadShell = useCallback(async () => {
    try {
      const [data, settingsData] = await Promise.all([
        getStaffDashboard(),
        getUserSettings(),
      ]);
      setStaffUser(data.user);
      setSummary(data.summary);
      setProfileTheme(getProfileTheme(settingsData.settings.profileTheme));
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

  function updateProfileTheme(themeId: ProfileThemeId) {
    setProfileTheme(getProfileTheme(themeId));
  }

  function updateStaffUser(user: StaffDashboardUser) {
    setStaffUser(user);
  }

  return {
    staffUser,
    summary,
    navItems,
    profileTheme,
    loading,
    error,
    handleLogout,
    refreshShell: loadShell,
    updateProfileTheme,
    updateStaffUser,
  };
}
