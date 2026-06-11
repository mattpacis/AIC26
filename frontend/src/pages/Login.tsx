import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBriefcase,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLayoutDashboard,
  IconLock,
  IconLogin,
  IconMail,
  IconMessageChatbot,
  IconSparkles,
  IconTicket,
  IconUser,
} from '@tabler/icons-react';
import {
  getAuthProviders,
  getStaffSignupDepartments,
  login,
  oauthStartUrl,
  register,
  requestPasswordReset,
  resetPassword,
  type StaffSignupDepartment,
} from '../api/client';
import { Campus360Logo } from '../components/Campus360Logo';
import { usePageTitle } from '../hooks/usePageTitle';
import './Login.css';

type Role = 'student' | 'staff';
type AuthMode = 'signin' | 'signup';
type AuthView = AuthMode | 'forgot' | 'reset';

const FEATURES = [
  {
    icon: IconMessageChatbot,
    color: '#2563EB',
    tone: 'ai',
    title: 'AI helpdesk that understands you',
    sub: 'Ask anything naturally — the AI identifies the right department and resolves or escalates for you.',
  },
  {
    icon: IconTicket,
    color: '#059669',
    tone: 'ticket',
    title: 'Smart ticket routing',
    sub: 'Tickets are created with full context, urgency, and suggested next steps — no back-and-forth needed.',
  },
  {
    icon: IconLayoutDashboard,
    color: '#D97706',
    tone: 'unified',
    title: 'Unified for students and staff',
    sub: 'Students track their concerns. Staff see clean, AI-summarized cases ready to act on.',
  },
] as const;

const TRUST_SIGNALS = [
  { icon: IconSparkles, label: 'AI triage' },
  { icon: IconLock, label: 'Secure sign-in' },
  { icon: IconCheck, label: 'Always on' },
] as const;

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const outerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [authView, setAuthView] = useState<AuthView>('signin');
  const [resetToken, setResetToken] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [staffDepartments, setStaffDepartments] = useState<StaffSignupDepartment[]>(
    [],
  );
  const [staffDepartment, setStaffDepartment] = useState('');

  const pageTitle =
    authView === 'forgot'
      ? 'Forgot password'
      : authView === 'reset'
        ? 'Reset password'
        : mode === 'signup'
          ? 'Create account'
          : 'Sign in';
  usePageTitle(pageTitle);

  const [statusCheckedAt] = useState(() => new Date());
  const statusUpdatedLabel = statusCheckedAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const emailHint =
    role === 'student'
      ? 'Use your school-issued student email'
      : 'Use your faculty or staff university email';

  useEffect(() => {
    getAuthProviders()
      .then(({ providers }) => {
        setGoogleEnabled(providers.google.enabled);
        setMicrosoftEnabled(providers.microsoft.enabled);
      })
      .catch(() => {
        setGoogleEnabled(false);
        setMicrosoftEnabled(false);
      });

    getStaffSignupDepartments()
      .then(({ departments }) => {
        setStaffDepartments(departments);
        if (departments[0]) {
          setStaffDepartment(departments[0].key);
        }
      })
      .catch(() => {
        setStaffDepartments([]);
      });
  }, []);

  useEffect(() => {
    const outerEl = outerRef.current;
    const shellEl = shellRef.current;
    if (!outerEl || !shellEl) return;

    const scale = () => {
      if (window.innerWidth <= 900) {
        shellEl.style.transform = '';
        outerEl.style.height = '';
        return;
      }

      const w = outerEl.clientWidth || 680;
      const s = Math.min(w / 1440, 1);
      shellEl.style.transform = `scale(${s})`;
      outerEl.style.height = `${Math.round(1024 * s)}px`;
    };

    scale();
    window.addEventListener('resize', scale);
    return () => window.removeEventListener('resize', scale);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid university email address.');
      return;
    }

    if (authView === 'forgot') {
      setLoading(true);
      setError(null);
      setInfoMessage(null);
      try {
        const result = await requestPasswordReset(trimmedEmail);
        setInfoMessage(result.message);
        if (result.resetToken) {
          setResetToken(result.resetToken);
        }
        setAuthView('reset');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not start password reset',
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (authView === 'reset') {
      if (!resetToken.trim()) {
        setError('Enter the reset token from your email.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await resetPassword({
          email: trimmedEmail,
          token: resetToken.trim(),
          password,
        });
        setInfoMessage(result.message);
        setPassword('');
        setResetToken('');
        setMode('signin');
        setAuthView('signin');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reset password');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (mode === 'signup' && role === 'staff' && !staffDepartment) {
      setError('Choose your department.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { user } =
        mode === 'signup'
          ? await register(
              trimmedEmail,
              password,
              name.trim(),
              role,
              role === 'staff' ? staffDepartment : undefined,
            )
          : await login(trimmedEmail, password);
      navigate(
        user.role === 'staff' ? '/staff-dashboard' : '/dashboard',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === 'signup'
            ? 'Could not create your account. Please try again.'
            : 'Sign in failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setAuthView(next);
    setError(null);
    setInfoMessage(null);
  }

  return (
    <div className="login-page">
      <h2 className="login-page__sr-only">
        Campus360 login page with a branded left panel and a login form on the
        right, including student and staff role toggle and school SSO option
      </h2>

      <div className="login-page__outer" ref={outerRef}>
        <div className="login-page__shell" ref={shellRef}>
          <div className="login-page__left-panel">
            <div className="login-page__ambient" aria-hidden>
              <span className="login-page__orb login-page__orb--1" />
              <span className="login-page__orb login-page__orb--2" />
              <span className="login-page__orb login-page__orb--3" />
            </div>
            <div className="login-page__brand-row">
              <Campus360Logo variant="login" animate />
            </div>

            <div className="login-page__hero-section">
              <div className="login-page__hero-tag">
                <IconSparkles size={13} aria-hidden />
                <span className="login-page__hero-tag-text">
                  AI-powered university service hub
                </span>
              </div>
              <h1 className="login-page__hero-title">
                One place for every
                <br />
                <span>campus concern.</span>
              </h1>
              <p className="login-page__hero-sub">
                Stop figuring out which office to email. Just describe your
                concern and Campus360 AI handles the rest — from tuition holds
                to medical certificates.
              </p>

              <div className="login-page__trust-row" aria-hidden>
                {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
                  <span className="login-page__trust-pill" key={label}>
                    <Icon size={12} aria-hidden />
                    {label}
                  </span>
                ))}
              </div>

              <div className="login-page__feature-list">
                {FEATURES.map(({ icon: Icon, color, tone, title, sub }) => (
                  <div className="login-page__feature-item" key={title}>
                    <div
                      className={`login-page__feature-icon login-page__feature-icon--${tone}`}
                    >
                      <Icon size={16} color={color} aria-hidden />
                    </div>
                    <div>
                      <div className="login-page__feature-text-title">
                        {title}
                      </div>
                      <div className="login-page__feature-text-sub">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="login-page__left-footer">
              <span>© 2026 Campus360</span>
              <span>·</span>
              <span>Privacy policy</span>
              <span>·</span>
              <span>Support</span>
            </div>
          </div>

          <div className="login-page__right-panel">
            <div className="login-page__right-bg" aria-hidden>
              <span className="login-page__right-dots" />
              <span className="login-page__right-glow login-page__right-glow--seam" />
              <span className="login-page__right-glow login-page__right-glow--center" />
              <span className="login-page__right-glow login-page__right-glow--corner" />
              <span className="login-page__right-ring" />
            </div>
            <div className="login-page__ambient login-page__ambient--light" aria-hidden>
              <span className="login-page__orb login-page__orb--4" />
              <span className="login-page__orb login-page__orb--5" />
              <span className="login-page__orb login-page__orb--6" />
            </div>
            <div className="login-page__login-card-wrap">
              <div className="login-page__login-card">
              <div className="login-page__login-header">
                <div className="login-page__login-accent" aria-hidden />
                <h2 className="login-page__login-title">
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="login-page__login-sub">
                  {mode === 'signin'
                    ? 'Sign in with your email and password to continue'
                    : 'Register with email and password — no verification needed for now'}
                </p>
              </div>

              <div className="login-page__status-bar">
                <span className="login-page__status-dot" />
                <span className="login-page__status-text">
                  All systems operational · Last updated {statusUpdatedLabel}
                </span>
              </div>

              <div className="login-page__role-toggle">
                <button
                  type="button"
                  className={`login-page__role-btn${role === 'student' ? ' active' : ''}`}
                  onClick={() => setRole('student')}
                >
                  <IconUser size={14} aria-hidden />
                  Student
                </button>
                <button
                  type="button"
                  className={`login-page__role-btn${role === 'staff' ? ' active' : ''}`}
                  onClick={() => setRole('staff')}
                >
                  <IconBriefcase size={14} aria-hidden />
                  Staff / Faculty
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {mode === 'signup' && role === 'staff' && staffDepartments.length > 0 && (
                  <div className="login-page__form-group">
                    <label className="login-page__form-label" htmlFor="department">
                      Department
                    </label>
                    <select
                      id="department"
                      className="login-page__form-input login-page__form-select"
                      value={staffDepartment}
                      onChange={(e) => setStaffDepartment(e.target.value)}
                      required
                    >
                      {staffDepartments.map((dept) => (
                        <option key={dept.key} value={dept.key}>
                          {dept.signupLabel}
                        </option>
                      ))}
                    </select>
                    <div className="login-page__form-hint">
                      You will only see tickets and students for this department.
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="login-page__form-group">
                    <label className="login-page__form-label" htmlFor="name">
                      Full name
                    </label>
                    <div className="login-page__input-wrap">
                      <span className="login-page__input-icon">
                        <IconUser size={16} aria-hidden />
                      </span>
                      <input
                        id="name"
                        className="login-page__form-input"
                        type="text"
                        placeholder="Alex Johnson"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="login-page__form-group">
                  <label className="login-page__form-label" htmlFor="email">
                    University email
                  </label>
                  <div className="login-page__input-wrap">
                    <span className="login-page__input-icon">
                      <IconMail size={16} aria-hidden />
                    </span>
                    <input
                      id="email"
                      className="login-page__form-input"
                      type="text"
                      inputMode="email"
                      placeholder="you@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="login-page__form-hint">{emailHint}</div>
                </div>

                {authView !== 'forgot' && authView !== 'reset' && (
                <div className="login-page__form-group">
                  <label className="login-page__form-label" htmlFor="password">
                    Password
                  </label>
                  <div className="login-page__input-wrap">
                    <span className="login-page__input-icon">
                      <IconLock size={16} aria-hidden />
                    </span>
                    <input
                      id="password"
                      className="login-page__form-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        mode === 'signup' ? 'new-password' : 'current-password'
                      }
                      required
                    />
                    <button
                      type="button"
                      className="login-page__input-right"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <IconEyeOff size={15} aria-hidden />
                      ) : (
                        <IconEye size={15} aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
                )}

                {authView === 'reset' && (
                  <>
                    <div className="login-page__form-group">
                      <label className="login-page__form-label" htmlFor="reset-token">
                        Reset token
                      </label>
                      <input
                        id="reset-token"
                        className="login-page__form-input"
                        type="text"
                        placeholder="Paste token from email"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        required
                      />
                    </div>
                    <div className="login-page__form-group">
                      <label className="login-page__form-label" htmlFor="password">
                        New password
                      </label>
                      <input
                        id="password"
                        className="login-page__form-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </>
                )}

                {authView === 'signin' ? (
                  <div className="login-page__forgot-row">
                    <button
                      type="button"
                      className="login-page__remember-row"
                      onClick={() => setRememberMe((v) => !v)}
                    >
                      <span
                        className={`login-page__remember-check${rememberMe ? ' checked' : ''}`}
                      >
                        {rememberMe && <IconCheck size={11} aria-hidden />}
                      </span>
                      Keep me signed in
                    </button>
                    <button
                      type="button"
                      className="login-page__forgot-link"
                      onClick={() => {
                        setAuthView('forgot');
                        setError(null);
                        setInfoMessage(null);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : mode === 'signup' ? (
                  <div className="login-page__form-hint login-page__form-hint--spaced">
                    Password must be at least 8 characters.
                  </div>
                ) : authView === 'forgot' ? (
                  <div className="login-page__form-hint login-page__form-hint--spaced">
                    We&apos;ll send a reset link if this email has a password account.
                  </div>
                ) : (
                  <div className="login-page__form-hint login-page__form-hint--spaced">
                    Enter the token and choose a new password.
                  </div>
                )}

                {(authView === 'forgot' || authView === 'reset') && (
                  <button
                    type="button"
                    className="login-page__forgot-link"
                    style={{ alignSelf: 'flex-start', marginBottom: 8 }}
                    onClick={() => {
                      setAuthView('signin');
                      setMode('signin');
                      setError(null);
                    }}
                  >
                    ← Back to sign in
                  </button>
                )}

                {infoMessage && <p className="login-page__form-hint">{infoMessage}</p>}
                {error && <p className="login-page__error">{error}</p>}

                <button
                  type="submit"
                  className="login-page__login-btn"
                  disabled={
                    loading ||
                    !email.trim() ||
                    (authView !== 'forgot' && !password) ||
                    (mode === 'signup' && authView === 'signup' && !name.trim())
                  }
                >
                  <IconLogin size={16} aria-hidden />
                  {loading
                    ? authView === 'forgot'
                      ? 'Sending…'
                      : authView === 'reset'
                        ? 'Updating password…'
                        : mode === 'signup'
                          ? 'Creating account…'
                          : 'Signing in…'
                    : authView === 'forgot'
                      ? 'Send reset link'
                      : authView === 'reset'
                        ? 'Update password'
                        : mode === 'signup'
                          ? 'Create account'
                          : 'Sign in to Campus360'}
                </button>
              </form>

              <p className="login-page__mode-switch">
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className="login-page__mode-switch-btn"
                      onClick={() => switchMode('signup')}
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="login-page__mode-switch-btn"
                      onClick={() => switchMode('signin')}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <div className="login-page__divider">
                <div className="login-page__divider-line" />
                <span className="login-page__divider-text">or continue with</span>
                <div className="login-page__divider-line" />
              </div>

              <div className="login-page__sso-row">
                <button
                  type="button"
                  className="login-page__sso-btn"
                  disabled={!googleEnabled}
                  onClick={() => {
                    window.location.href = oauthStartUrl('google', role);
                  }}
                >
                  <span className="login-page__sso-icon" aria-hidden>
                    <GoogleLogo />
                  </span>
                  {googleEnabled ? 'Google' : 'Google · soon'}
                </button>
                <button
                  type="button"
                  className="login-page__sso-btn"
                  disabled={!microsoftEnabled}
                  onClick={() => {
                    window.location.href = oauthStartUrl('microsoft', role);
                  }}
                >
                  <span className="login-page__sso-icon" aria-hidden>
                    <MicrosoftLogo />
                  </span>
                  {microsoftEnabled ? 'Microsoft' : 'Microsoft · soon'}
                </button>
              </div>
              {!googleEnabled && !microsoftEnabled && (
                <p className="login-page__sso-hint">
                  Google and Microsoft sign-in coming soon — use email and password for now.
                </p>
              )}

              <div className="login-page__login-footer">
                Having trouble? <span>Contact IT Support</span> or visit the{' '}
                <span>Help Center</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
