import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  IconBell,
  IconCalendarEvent,
  IconLink,
  IconLogout,
  IconMessageChatbot,
  IconSearch,
  IconSettings,
  IconTicket,
} from '@tabler/icons-react';
import {
  deleteAccount,
  getUserSettings,
  listNotifications,
  listTickets,
  logout,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  updateProfile,
  updateUserSettings,
  userInitials,
  type NotificationRecord,
  type TicketSummary,
  type User,
  type UserSettings,
} from '../api/client';
import { QUICK_LINKS, openCampusPortal } from '../config/quickLinks';
import {
  getProfileTheme,
  PROFILE_THEMES,
  type ProfileThemeId,
} from '../utils/profileTheme';
import { useNotificationToasts } from '../hooks/useNotificationToasts';
import { useAnchoredMenu } from '../hooks/useAnchoredMenu';

type StudentTopbarProps = {
  user: User;
  onUserUpdated: (user: User) => void;
};

type PageSearchItem = { label: string; detail: string; path: string };

type SearchResult =
  | { kind: 'page'; label: string; detail: string; path: string }
  | { kind: 'link'; label: string; detail: string; url: string }
  | { kind: 'ticket'; label: string; detail: string; path: string };

const SEARCH_PAGES: PageSearchItem[] = [
  { label: 'AI Helpdesk', detail: 'Chat with the campus helpdesk', path: '/dashboard' },
  { label: 'My Tickets', detail: 'View and manage support tickets', path: '/tickets' },
  { label: 'Appointments', detail: 'Schedule and manage appointments', path: '/appointments' },
  { label: 'Quick Links', detail: 'Campus portals and resources', path: '/quick-links' },
  { label: 'Settings', detail: 'Notifications and profile preferences', path: '/settings' },
];

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function StudentTopbar({ user, onUserUpdated }: StudentTopbarProps) {
  useNotificationToasts(true);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState<TicketSummary[]>([]);

  const profileTheme = getProfileTheme(settings?.profileTheme);
  const profileMenuStyle = useAnchoredMenu(profileOpen, menuRef);
  const notifMenuStyle = useAnchoredMenu(notifOpen, notifRef);

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const data = await getUserSettings();
        if (!cancelled) {
          setSettings(data.settings);
        }
      } catch {
        if (!cancelled) {
          setSettings(null);
        }
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const data = await listNotifications();
        if (!cancelled) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    if (!searchOpen) return;

    let cancelled = false;
    void listTickets()
      .then((data) => {
        if (!cancelled) setTickets(data.tickets);
      })
      .catch(() => {
        if (!cancelled) setTickets([]);
      });

    return () => {
      cancelled = true;
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        profileOpen &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !profileDropdownRef.current?.contains(target)
      ) {
        setProfileOpen(false);
      }
      if (
        notifOpen &&
        notifRef.current &&
        !notifRef.current.contains(target) &&
        !notifDropdownRef.current?.contains(target)
      ) {
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen, notifOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotifOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) {
      return SEARCH_PAGES.map((item) => ({ kind: 'page' as const, ...item }));
    }

    const results: SearchResult[] = [];

    for (const page of SEARCH_PAGES) {
      if (matchesQuery(page.label, query) || matchesQuery(page.detail, query)) {
        results.push({ kind: 'page', ...page });
      }
    }

    for (const link of QUICK_LINKS) {
      if (matchesQuery(link.label, query) && link.url) {
        results.push({
          kind: 'link',
          label: link.label,
          detail: 'Open campus portal',
          url: link.url,
        });
      }
    }

    for (const ticket of tickets) {
      if (
        matchesQuery(ticket.id, query) ||
        matchesQuery(ticket.concern, query) ||
        matchesQuery(ticket.department, query)
      ) {
        results.push({
          kind: 'ticket',
          label: ticket.id,
          detail: `${ticket.concern} · ${ticket.statusLabel}`,
          path: `/tickets/${ticket.ticketNumber}`,
        });
      }
    }

    return results.slice(0, 12);
  }, [searchQuery, tickets]);

  async function handleSaveProfile() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await updateProfile(name.trim());
      onUserUpdated(updated);
      setEditOpen(false);
      setProfileOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeChange(themeId: ProfileThemeId) {
    if (savingTheme || settings?.profileTheme === themeId) return;
    setSavingTheme(true);
    try {
      const { settings: saved } = await updateUserSettings({ profileTheme: themeId });
      setSettings(saved);
    } catch {
      // Keep current theme on failure.
    } finally {
      setSavingTheme(false);
    }
  }

  async function handleLogout() {
    setProfileOpen(false);
    try {
      await logout();
    } catch {
      // Still return to login if logout fails.
    }
    navigate('/login');
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account');
      setDeleting(false);
    }
  }

  async function handleMarkRead(notificationId: string) {
    const { notification } = await markNotificationRead(notificationId);
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? notification : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function handleMarkAllRead() {
    const data = await markAllNotificationsRead();
    setNotifications(data.notifications);
    setUnreadCount(0);
  }

  async function handleClearAll() {
    const data = await clearAllNotifications();
    setNotifications(data.notifications);
    setUnreadCount(0);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
  }

  function openSearch() {
    setSearchOpen(true);
    setProfileOpen(false);
    setNotifOpen(false);
  }

  function handleSearchSelect(result: SearchResult) {
    if (result.kind === 'link') {
      openCampusPortal(result.url, result.label);
    } else {
      navigate(result.path);
    }
    closeSearch();
  }

  function searchIconFor(result: SearchResult) {
    if (result.kind === 'ticket') return IconTicket;
    if (result.kind === 'link') return IconLink;
    if (result.label === 'Appointments') return IconCalendarEvent;
    if (result.label === 'Settings') return IconSettings;
    if (result.label === 'AI Helpdesk') return IconMessageChatbot;
    return IconTicket;
  }

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
    <>
      <div className="student-dashboard__topbar-right">
        <button
          type="button"
          className="student-dashboard__topbar-icon"
          aria-label="Search"
          onClick={openSearch}
        >
          <IconSearch size={18} aria-hidden />
        </button>

        <div className="student-topbar__menu-wrap" ref={notifRef}>
          <button
            type="button"
            className="student-dashboard__topbar-icon"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((open) => !open);
              setProfileOpen(false);
            }}
          >
            <IconBell size={18} aria-hidden />
            {unreadCount > 0 && <span className="student-dashboard__notif-badge" />}
          </button>
        </div>

        <div className="student-topbar__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="student-dashboard__user-pill student-topbar__profile-btn"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotifOpen(false);
            }}
          >
            <div
              className="student-dashboard__user-avatar"
              style={{ background: profileTheme.bg, color: profileTheme.color }}
            >
              {userInitials(user.name)}
            </div>
            <div className="student-dashboard__user-info">
              <div className="student-dashboard__user-name">{user.name}</div>
              <div className="student-dashboard__user-email">{user.email}</div>
            </div>
          </button>
        </div>
      </div>

      {portalTarget &&
        notifOpen &&
        createPortal(
          <div
            ref={notifDropdownRef}
            className="student-topbar__dropdown student-topbar__dropdown--wide student-topbar__dropdown--portal"
            style={notifMenuStyle}
          >
            <div className="student-topbar__dropdown-header">
              <strong>Notifications</strong>
              {notifications.length > 0 && (
                <div className="student-topbar__dropdown-actions">
                  {unreadCount > 0 && (
                    <button type="button" onClick={() => void handleMarkAllRead()}>
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="student-topbar__dropdown-action--muted"
                    onClick={() => void handleClearAll()}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="student-topbar__empty">No notifications yet.</p>
            ) : (
              <ul className="student-topbar__notif-list">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`student-topbar__notif-item${notification.read ? '' : ' unread'}`}
                      onClick={() => {
                        if (!notification.read) {
                          void handleMarkRead(notification.id);
                        }
                        if (notification.link) {
                          navigate(notification.link);
                          setNotifOpen(false);
                        }
                      }}
                    >
                      <strong>{notification.title}</strong>
                      <span>{notification.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          portalTarget,
        )}

      {portalTarget &&
        profileOpen &&
        createPortal(
          <div
            ref={profileDropdownRef}
            className="student-topbar__dropdown student-topbar__dropdown--profile student-topbar__dropdown--portal"
            style={profileMenuStyle}
          >
            <div className="student-topbar__dropdown-section">
              <span className="student-topbar__dropdown-label">Profile color</span>
              <div className="student-topbar__theme-swatches">
                {PROFILE_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`student-topbar__theme-swatch${
                      settings?.profileTheme === theme.id ? ' active' : ''
                    }`}
                    style={{ background: theme.bg }}
                    aria-label={theme.label}
                    aria-pressed={settings?.profileTheme === theme.id}
                    disabled={savingTheme}
                    onClick={() => void handleThemeChange(theme.id)}
                  />
                ))}
              </div>
            </div>

            <div className="student-topbar__dropdown-divider" />

            <button
              type="button"
              className="student-topbar__menu-item"
              onClick={() => {
                setEditOpen(true);
                setProfileOpen(false);
              }}
            >
              Edit details
            </button>
            <button
              type="button"
              className="student-topbar__menu-item"
              onClick={() => {
                setProfileOpen(false);
                navigate('/settings');
              }}
            >
              <IconSettings size={15} aria-hidden />
              Settings
            </button>
            <button
              type="button"
              className="student-topbar__menu-item"
              onClick={() => void handleLogout()}
            >
              <IconLogout size={15} aria-hidden />
              Logout
            </button>

            <div className="student-topbar__dropdown-divider" />

            <button
              type="button"
              className="student-topbar__menu-item danger"
              onClick={() => {
                setDeleteOpen(true);
                setProfileOpen(false);
              }}
            >
              Delete account
            </button>
          </div>,
          portalTarget,
        )}

      {portalTarget &&
        searchOpen &&
        createPortal(
          <div
            className="student-topbar__search-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSearch();
            }}
          >
            <div className="student-topbar__search-panel" role="dialog" aria-modal="true">
              <div className="student-topbar__search-input-wrap">
                <IconSearch size={18} aria-hidden />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search pages, tickets, quick links…"
                  aria-label="Search Campus360"
                />
              </div>
              <ul className="student-topbar__search-results">
                {searchResults.length === 0 ? (
                  <li className="student-topbar__search-empty">No results found.</li>
                ) : (
                  searchResults.map((result) => {
                    const Icon = searchIconFor(result);
                    return (
                      <li key={`${result.kind}-${result.label}-${result.detail}`}>
                        <button
                          type="button"
                          className="student-topbar__search-result"
                          onClick={() => handleSearchSelect(result)}
                        >
                          <span className="student-topbar__search-result-icon">
                            <Icon size={16} aria-hidden />
                          </span>
                          <span className="student-topbar__search-result-text">
                            <strong>{result.label}</strong>
                            <span>{result.detail}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          portalTarget,
        )}

      {portalTarget &&
        editOpen &&
        createPortal(
          <div className="student-topbar__modal-overlay">
            <div className="student-topbar__modal" role="dialog" aria-modal="true">
              <h3>Edit profile</h3>
              <label>
                Full name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <p className="student-topbar__modal-note">Email: {user.email}</p>

              <div className="student-topbar__modal-themes">
                <span className="student-topbar__dropdown-label">Profile color</span>
                <div className="student-topbar__theme-swatches">
                  {PROFILE_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`student-topbar__theme-swatch${
                        settings?.profileTheme === theme.id ? ' active' : ''
                      }`}
                      style={{ background: theme.bg }}
                      aria-label={theme.label}
                      aria-pressed={settings?.profileTheme === theme.id}
                      disabled={savingTheme}
                      onClick={() => void handleThemeChange(theme.id)}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="student-topbar__error">{error}</p>}
              <div className="student-topbar__modal-actions">
                <button type="button" onClick={() => setEditOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="button" onClick={() => void handleSaveProfile()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>,
          portalTarget,
        )}

      {portalTarget &&
        deleteOpen &&
        createPortal(
          <div className="student-topbar__modal-overlay">
            <div className="student-topbar__modal" role="dialog" aria-modal="true">
              <h3>Delete account?</h3>
              <p>
                This permanently removes your profile, tickets, and chat history. This
                cannot be undone.
              </p>
              {error && <p className="student-topbar__error">{error}</p>}
              <div className="student-topbar__modal-actions">
                <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
}
