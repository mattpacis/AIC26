import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconDownload,
  IconPlus,
  IconTrendingDown,
} from '@tabler/icons-react';
import { getStaffAnalytics, type StaffAnalytics as StaffAnalyticsData } from '../api/client';
import { StaffNewTicketModal } from '../components/StaffNewTicketModal';
import { StaffTopbar } from '../components/StaffTopbar';
import '../components/StaffTopbar.css';
import { useShellScale } from '../hooks/useShellScale';
import { useStaffShell } from '../hooks/useStaffShell';
import { exportStaffAnalyticsCsv } from '../utils/exportStaffAnalytics';
import './StaffDashboard.css';
import './StaffAnalytics.css';

const URGENCY_COLORS = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
};

export function StaffAnalytics() {
  const navigate = useNavigate();
  const { outerRef, shellRef } = useShellScale({ mobileBreakpoint: 1100 });
  const { staffUser, navItems, profileTheme, updateProfileTheme, updateStaffUser } =
    useStaffShell();
  const [analytics, setAnalytics] = useState<StaffAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getStaffAnalytics();
        if (!cancelled) {
          setAnalytics(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const departmentLabel = staffUser?.department ?? 'Staff';
  const urgencyTotal =
    (analytics?.urgency.low ?? 0) +
    (analytics?.urgency.medium ?? 0) +
    (analytics?.urgency.high ?? 0);

  return (
    <div className="staff-dashboard staff-analytics">
      <div className="staff-dashboard__outer" ref={outerRef}>
        <div className="staff-dashboard__shell" ref={shellRef}>
          <aside className="staff-dashboard__sidebar">
            <div className="staff-dashboard__sb-logo">
              <div className="staff-dashboard__sb-logo-icon">
                <IconBuildingCommunity size={18} aria-hidden />
              </div>
              <span className="staff-dashboard__sb-logo-text">Campus360</span>
            </div>

            <div className="staff-dashboard__sb-staff-wrap">
              <div className="staff-dashboard__sb-staff">
                <div
                  className="staff-dashboard__sb-avatar"
                  style={{
                    background: profileTheme.bg,
                    color: profileTheme.color,
                  }}
                >
                  {staffUser?.initials ?? '—'}
                </div>
                <div>
                  <div className="staff-dashboard__sb-name">
                    {staffUser?.name ?? 'Loading…'}
                  </div>
                  <div className="staff-dashboard__sb-role">
                    {staffUser?.roleLabel ?? 'Staff'}
                  </div>
                </div>
              </div>
            </div>

            <div className="staff-dashboard__sb-dept">Department</div>
            <nav className="staff-dashboard__sb-nav">
              {navItems.map(
                ({ label, icon: Icon, path, active, badge, badgeAmber }) => (
                  <button
                    key={label}
                    type="button"
                    className={`staff-dashboard__nav-item${active ? ' active' : ''}`}
                    onClick={() => navigate(path)}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                    {badge !== undefined && badge > 0 && (
                      <span className="staff-dashboard__nav-badge">{badge}</span>
                    )}
                    {badgeAmber !== undefined && badgeAmber > 0 && (
                      <span className="staff-dashboard__nav-badge amber">
                        {badgeAmber}
                      </span>
                    )}
                  </button>
                ),
              )}
            </nav>
          </aside>

          <main className="staff-dashboard__main">
            <header className="staff-dashboard__topbar">
              <div className="staff-dashboard__topbar-title">
                {departmentLabel} — Analytics
              </div>
              <div className="staff-dashboard__topbar-right">
                <button
                  type="button"
                  className="staff-dashboard__tb-btn"
                  onClick={() => {
                    if (!analytics) return;
                    exportStaffAnalyticsCsv(analytics, departmentLabel);
                  }}
                  disabled={!analytics}
                >
                  <IconDownload size={14} aria-hidden />
                  Export
                </button>
                <button
                  type="button"
                  className="staff-dashboard__tb-btn staff-dashboard__tb-btn-primary"
                  onClick={() => setShowNewTicket(true)}
                >
                  <IconPlus size={14} aria-hidden />
                  New ticket
                </button>
                {staffUser && (
                  <StaffTopbar
                    user={staffUser}
                    profileTheme={profileTheme}
                    onUserUpdated={updateStaffUser}
                    onThemeUpdated={(theme) => updateProfileTheme(theme.id)}
                  />
                )}
              </div>
            </header>

            {showNewTicket && staffUser?.department && (
              <StaffNewTicketModal
                open={showNewTicket}
                department={staffUser.department}
                onClose={() => setShowNewTicket(false)}
                onCreated={() => navigate('/staff-dashboard')}
              />
            )}

            <div className="staff-analytics__content">
              {loading && (
                <p className="staff-analytics__empty">Loading analytics…</p>
              )}
              {error && <p className="staff-analytics__error">{error}</p>}
              {!loading && analytics && (
                <>
                  <div className="staff-dashboard__stat-grid staff-analytics__stat-grid">
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num">
                        {analytics.summary.queueCount}
                      </div>
                      <div className="staff-dashboard__stat-label">Open queue</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num amber">
                        {analytics.summary.openCount}
                      </div>
                      <div className="staff-dashboard__stat-label">Action needed</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num blue">
                        {analytics.summary.progressCount}
                      </div>
                      <div className="staff-dashboard__stat-label">In progress</div>
                    </div>
                    <div className="staff-dashboard__stat-card">
                      <div className="staff-dashboard__stat-num green">
                        {analytics.summary.resolvedCount}
                      </div>
                      <div className="staff-dashboard__stat-label">Resolved total</div>
                    </div>
                  </div>

                  <div className="staff-analytics__panels">
                    <section className="staff-analytics__panel">
                      <h3 className="staff-analytics__panel-title">Ticket status</h3>
                      <div className="staff-analytics__bars">
                        {analytics.statusBreakdown.map((row) => {
                          const max = Math.max(
                            ...analytics.statusBreakdown.map((item) => item.count),
                            1,
                          );
                          return (
                            <div className="staff-analytics__bar-row" key={row.key}>
                              <span className="staff-analytics__bar-label">
                                {row.label}
                              </span>
                              <div className="staff-analytics__bar-track">
                                <div
                                  className={`staff-analytics__bar-fill staff-analytics__bar-fill--${row.key}`}
                                  style={{ width: `${(row.count / max) * 100}%` }}
                                />
                              </div>
                              <span className="staff-analytics__bar-value">
                                {row.count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="staff-analytics__panel">
                      <h3 className="staff-analytics__panel-title">
                        Open tickets by urgency
                      </h3>
                      <div className="staff-analytics__urgency-grid">
                        {(
                          [
                            ['low', analytics.urgency.low],
                            ['medium', analytics.urgency.medium],
                            ['high', analytics.urgency.high],
                          ] as const
                        ).map(([key, count]) => (
                          <div className="staff-analytics__urgency-card" key={key}>
                            <div
                              className="staff-analytics__urgency-dot"
                              style={{ background: URGENCY_COLORS[key] }}
                            />
                            <div className="staff-analytics__urgency-count">{count}</div>
                            <div className="staff-analytics__urgency-label">
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </div>
                            {urgencyTotal > 0 && (
                              <div className="staff-analytics__urgency-pct">
                                {Math.round((count / urgencyTotal) * 100)}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="staff-analytics__panel">
                      <h3 className="staff-analytics__panel-title">Resolution time</h3>
                      <div className="staff-dashboard__resolution-panel">
                        <div className="staff-dashboard__resolution-value">
                          {analytics.resolution.average ?? '—'}
                        </div>
                        <div className="staff-dashboard__resolution-trend">
                          <IconTrendingDown size={13} aria-hidden />
                          {analytics.resolution.withinTargetPercent !== null
                            ? `${analytics.resolution.withinTargetPercent}% within target`
                            : 'Not enough resolved tickets yet'}
                        </div>
                        <div className="staff-dashboard__resolution-track">
                          <div
                            className="staff-dashboard__resolution-fill"
                            style={{
                              width: `${analytics.resolution.withinTargetPercent ?? 0}%`,
                            }}
                          />
                        </div>
                        <div className="staff-dashboard__resolution-target">
                          Target: {analytics.resolution.targetLabel} ·{' '}
                          {analytics.summary.resolvedThisWeek} resolved this week
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
