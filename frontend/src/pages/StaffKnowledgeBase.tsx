import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Campus360Logo } from '../components/Campus360Logo';
import {
  IconAlertTriangle,
  IconBook,
  IconBuildingCommunity,
  IconCircleCheck,
  IconClipboardList,
  IconClock,
  IconDownload,
  IconEye,
  IconFileCertificate,
  IconFileText,
  IconHeartRateMonitor,
  IconLock,
  IconLogout,
  IconPencil,
  IconPlus,
  IconRobot,
  IconSearch,
  IconSettings,
  IconShare,
  IconShield,
  IconUpload,
  IconUsers,
} from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import {
  getStaffKbArticle,
  listStaffKbArticles,
  type StaffKbArticleDetail,
  type StaffKbArticleSummary,
} from '../api/client';
import { StaffNotifications } from '../components/StaffNotifications';
import { useShellScale } from '../hooks/useShellScale';
import { useStaffShell } from '../hooks/useStaffShell';
import './StaffKnowledgeBase.css';

type ArticleFilter = 'all' | 'procedures' | 'forms' | 'policies' | 'ai-used';

const FILTER_CHIPS: { key: ArticleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'procedures', label: 'Procedures' },
  { key: 'forms', label: 'Forms' },
  { key: 'policies', label: 'Policies' },
  { key: 'ai-used', label: 'AI-used' },
];

function departmentMeta(department: string | null | undefined): {
  label: string;
  icon: TablerIcon;
  color: string;
} {
  const lower = (department ?? '').toLowerCase();
  if (lower.includes('health')) {
    return { label: department ?? 'Campus Health', icon: IconHeartRateMonitor, color: '#0F766E' };
  }
  if (lower.includes('it')) {
    return { label: department ?? 'IT Department', icon: IconBuildingCommunity, color: '#1D4ED8' };
  }
  if (lower.includes('student')) {
    return { label: department ?? 'Student Services', icon: IconUsers, color: '#7C3AED' };
  }
  return { label: department ?? 'Department', icon: IconBook, color: '#374151' };
}

function articleIcon(category: string): { icon: TablerIcon; bg: string; color: string } {
  switch (category) {
    case 'policies':
      return { icon: IconShield, bg: '#FEF3C7', color: '#D97706' };
    case 'forms':
      return { icon: IconFileText, bg: '#EFF6FF', color: '#2563EB' };
    case 'procedures':
      return { icon: IconClipboardList, bg: '#F0FDF4', color: '#16A34A' };
    default:
      return { icon: IconFileCertificate, bg: '#F5F3FF', color: '#7C3AED' };
  }
}

function tagClass(tag: string, aiReferenced: boolean): string {
  if (tag.toLowerCase().includes('ai')) return 'staff-kb__b-ai';
  if (aiReferenced) return 'staff-kb__b-ai';
  if (tag.toLowerCase().includes('policy')) return 'staff-kb__b-gen';
  return 'staff-kb__b-health';
}

function matchesArticleFilter(article: StaffKbArticleSummary, filter: ArticleFilter) {
  if (filter === 'all') return true;
  return article.filters.includes(filter);
}

export function StaffKnowledgeBase() {
  const navigate = useNavigate();
  const { outerRef, shellRef } = useShellScale({ mobileBreakpoint: 1100 });
  const { staffUser, navItems, handleLogout } = useStaffShell();

  const staffDepartment = departmentMeta(staffUser?.department);
  const StaffDeptIcon = staffDepartment.icon;

  const [articles, setArticles] = useState<StaffKbArticleSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<StaffKbArticleDetail | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [activeFilter, setActiveFilter] = useState<ArticleFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { articles: rows } = await listStaffKbArticles(
        search.trim() ? { search: search.trim() } : undefined,
      );
      setArticles(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((a) => a.id === prev)) return prev;
        return rows[0]?.id ?? '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getStaffKbArticle(selectedId)
      .then(({ article }) => {
        if (!cancelled) setSelectedDetail(article);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load article');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredArticles = useMemo(
    () => articles.filter((a) => matchesArticleFilter(a, activeFilter)),
    [articles, activeFilter],
  );

  const categoryCounts = useMemo(() => {
    const counts = { procedures: 0, forms: 0, policies: 0, ai: 0 };
    for (const article of articles) {
      if (article.category === 'procedures') counts.procedures += 1;
      if (article.category === 'forms') counts.forms += 1;
      if (article.category === 'policies') counts.policies += 1;
      if (article.aiReferenced) counts.ai += 1;
    }
    return counts;
  }, [articles]);

  const relatedArticles = (selectedDetail?.relatedIds ?? [])
    .map((id) => articles.find((a) => a.id === id))
    .filter((a): a is StaffKbArticleSummary => Boolean(a));

  return (
    <div className="staff-kb">
      <h2 className="staff-kb__sr-only">
        Campus360 staff knowledge base with article browse, search, and detail panel
      </h2>

      <div className="staff-kb__outer" ref={outerRef}>
        <div className="staff-kb__shell" ref={shellRef}>
          <aside className="staff-kb__sidebar">
            <div className="staff-kb__sb-logo">
              <Campus360Logo variant="sidebar-staff" />
            </div>

            <div className="staff-kb__sb-staff-wrap">
              <div className="staff-kb__sb-staff">
                <div className="staff-kb__sb-avatar">{staffUser?.initials ?? '—'}</div>
                <div>
                  <div className="staff-kb__sb-name">{staffUser?.name ?? 'Loading…'}</div>
                  <div className="staff-kb__sb-role">{staffUser?.roleLabel ?? 'Staff'}</div>
                </div>
              </div>
            </div>

            <div className="staff-kb__sb-dept">Department</div>
            <nav className="staff-kb__sb-nav">
              {navItems.map(
                ({ label, icon: Icon, path, active, badge, badgeAmber }) => (
                  <button
                    key={label}
                    type="button"
                    className={`staff-kb__nav-item${active ? ' active' : ''}`}
                    onClick={() => navigate(path)}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                    {badge !== undefined && badge > 0 && (
                      <span className="staff-kb__nav-badge">{badge}</span>
                    )}
                    {badgeAmber !== undefined && badgeAmber > 0 && (
                      <span className="staff-kb__nav-badge-amber">{badgeAmber}</span>
                    )}
                  </button>
                ),
              )}
            </nav>

            <div className="staff-kb__sb-dept staff-kb__sb-dept.system">System</div>
            <div className="staff-kb__sb-system">
              <button type="button" className="staff-kb__nav-item">
                <IconSettings size={16} aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="staff-kb__nav-item"
                onClick={() => void handleLogout()}
              >
                <IconLogout size={16} aria-hidden />
                Logout
              </button>
            </div>
            <div className="staff-kb__sb-spacer" />
          </aside>

          <div className="staff-kb__main">
            <header className="staff-kb__topbar">
              <div className="staff-kb__topbar-title">
                Knowledge Base — {staffDepartment.label}
              </div>
              <div className="staff-kb__topbar-right">
                <button type="button" className="staff-kb__tb-btn">
                  <IconUpload size={14} aria-hidden />
                  Import article
                </button>
                <button type="button" className="staff-kb__tb-btn staff-kb__tb-btn-primary">
                  <IconPlus size={14} aria-hidden />
                  New article
                </button>
                <StaffNotifications
                  buttonClassName="staff-kb__tb-icon"
                  dotClassName="staff-kb__notif-dot"
                />
              </div>
            </header>

            {error && <div style={{ padding: 16 }}>{error}</div>}

            <div className="staff-kb__content">
              <div className="staff-kb__left-col">
                <div className="staff-kb__left-header">
                  <div className="staff-kb__search-wrap">
                    <span className="staff-kb__search-icon">
                      <IconSearch size={15} aria-hidden />
                    </span>
                    <input
                      className="staff-kb__search-input"
                      placeholder="Search articles…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="staff-kb__cat-section">
                  <div className="staff-kb__cat-label">Your department</div>
                  <div className="staff-kb__scope-note">
                    <IconLock size={13} aria-hidden />
                    You can only access articles for {staffDepartment.label}.
                  </div>
                  <div className="staff-kb__cat-item staff-kb__cat-item--locked active">
                    <StaffDeptIcon size={15} color={staffDepartment.color} aria-hidden />
                    {staffDepartment.label}
                    <span className="staff-kb__cat-count">{articles.length}</span>
                  </div>
                </div>

                <div className="staff-kb__cat-section">
                  <div className="staff-kb__cat-label">Browse by type</div>
                  <button type="button" className="staff-kb__cat-item">
                    <IconClipboardList size={15} color="#374151" aria-hidden />
                    Procedures &amp; SOPs
                    <span className="staff-kb__cat-count">{categoryCounts.procedures}</span>
                  </button>
                  <button type="button" className="staff-kb__cat-item">
                    <IconFileText size={15} color="#374151" aria-hidden />
                    Forms &amp; templates
                    <span className="staff-kb__cat-count">{categoryCounts.forms}</span>
                  </button>
                  <button type="button" className="staff-kb__cat-item">
                    <IconShield size={15} color="#374151" aria-hidden />
                    Policies
                    <span className="staff-kb__cat-count">{categoryCounts.policies}</span>
                  </button>
                  <button type="button" className="staff-kb__cat-item">
                    <IconRobot size={15} color="#7C3AED" aria-hidden />
                    AI-referenced articles
                    <span className="staff-kb__cat-count">{categoryCounts.ai}</span>
                  </button>
                </div>
              </div>

              <div className="staff-kb__center-col">
                <div className="staff-kb__center-top">
                  <div className="staff-kb__center-title">
                    <StaffDeptIcon size={16} color={staffDepartment.color} aria-hidden />
                    {staffDepartment.label} — {filteredArticles.length} articles
                  </div>
                  <div className="staff-kb__filter-row">
                    {FILTER_CHIPS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={`staff-kb__filter-chip${activeFilter === key ? ' active' : ''}`}
                        onClick={() => setActiveFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="staff-kb__articles-grid">
                  {loading && (
                    <div style={{ padding: 16, color: '#64748b' }}>Loading articles…</div>
                  )}
                  {!loading && filteredArticles.length === 0 && (
                    <div style={{ padding: 16, color: '#64748b' }}>
                      No articles for your department yet.
                    </div>
                  )}
                  {filteredArticles.map((article) => {
                    const visuals = articleIcon(article.category);
                    const ArticleIcon = visuals.icon;
                    return (
                      <button
                        key={article.id}
                        type="button"
                        className={`staff-kb__article-card${selectedId === article.id ? ' selected' : ''}`}
                        onClick={() => setSelectedId(article.id)}
                      >
                        <div className="staff-kb__ac-top">
                          <div
                            className="staff-kb__ac-icon"
                            style={{ background: visuals.bg }}
                          >
                            <ArticleIcon size={16} color={visuals.color} aria-hidden />
                          </div>
                          <div>
                            <div className="staff-kb__ac-title">{article.title}</div>
                            <div className="staff-kb__ac-desc">{article.description}</div>
                          </div>
                        </div>
                        <div className="staff-kb__ac-footer">
                          {article.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`staff-kb__badge ${tagClass(tag, article.aiReferenced)}`}
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="staff-kb__ac-meta staff-kb__ac-meta.push-right">
                            <IconEye size={11} aria-hidden />
                            {article.views} views
                          </span>
                          <span className="staff-kb__ac-meta">
                            <IconClock size={11} aria-hidden />
                            {article.readTime}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="staff-kb__right-col">
                {detailLoading && (
                  <div style={{ padding: 16, color: '#64748b' }}>Loading article…</div>
                )}
                {!detailLoading && selectedDetail && (
                  <>
                    <div className="staff-kb__article-header">
                      <h1 className="staff-kb__article-title">{selectedDetail.title}</h1>
                      <div className="staff-kb__article-meta-row">
                        {selectedDetail.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`staff-kb__badge ${tagClass(tag, selectedDetail.aiReferenced)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="staff-kb__article-updated">{selectedDetail.updated}</span>
                      </div>
                      <div className="staff-kb__article-actions">
                        <button type="button" className="staff-kb__a-btn">
                          <IconShare size={12} aria-hidden />
                          Share
                        </button>
                        <button type="button" className="staff-kb__a-btn">
                          <IconPencil size={12} aria-hidden />
                          Edit
                        </button>
                        <button type="button" className="staff-kb__a-btn staff-kb__a-btn-primary">
                          <IconDownload size={12} aria-hidden />
                          Download form
                        </button>
                      </div>
                    </div>

                    <div className="staff-kb__article-body">
                      <div className="staff-kb__art-section">
                        <div className="staff-kb__art-section-title">Overview</div>
                        {selectedDetail.overview.map((para, i) => (
                          <p
                            key={i}
                            className={`staff-kb__art-para${i === 1 ? ' muted' : ''}`}
                          >
                            {para}
                          </p>
                        ))}
                      </div>

                      {selectedDetail.requirements.length > 0 && (
                        <div className="staff-kb__art-section">
                          <div className="staff-kb__art-section-title">
                            Requirements before the appointment
                          </div>
                          <div className="staff-kb__req-panel">
                            {selectedDetail.requirements.map((req) => (
                              <div className="staff-kb__req-item" key={req}>
                                <IconCircleCheck size={14} color="#16a34a" aria-hidden />
                                {req}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDetail.steps.length > 0 && (
                        <div className="staff-kb__art-section">
                          <div className="staff-kb__art-section-title">
                            Step-by-step procedure
                          </div>
                          <div className="staff-kb__steps-panel">
                            {selectedDetail.steps.map((step, index) => (
                              <div className="staff-kb__art-step" key={index}>
                                <div className="staff-kb__step-num">{index + 1}</div>
                                <div className="staff-kb__step-text">
                                  {step.text}
                                  {step.tag && (
                                    <span className="staff-kb__step-tag">{step.tag}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDetail.note && (
                        <div className="staff-kb__art-section">
                          <div className="staff-kb__art-section-title">Important note</div>
                          <div className="staff-kb__art-note">
                            <IconAlertTriangle size={16} aria-hidden />
                            <span>{selectedDetail.note}</span>
                          </div>
                        </div>
                      )}

                      {relatedArticles.length > 0 && (
                        <div className="staff-kb__art-section">
                          <div className="staff-kb__art-section-title">Related articles</div>
                          {relatedArticles.map((related) => {
                            const RelatedIcon = articleIcon(related.category).icon;
                            return (
                              <button
                                key={related.id}
                                type="button"
                                className="staff-kb__related-item"
                                onClick={() => setSelectedId(related.id)}
                              >
                                <RelatedIcon size={14} color="#9ca3af" aria-hidden />
                                {related.title}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {!detailLoading && !selectedDetail && !loading && (
                  <div style={{ padding: 16, color: '#64748b' }}>
                    Select an article to read.
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
