import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBriefcase,
  IconBuildingCommunity,
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
  type StaffSignupDepartment,
} from '../api/client';
import './Login.css';

type Role = 'student' | 'staff';
type AuthMode = 'signin' | 'signup';

const FEATURES = [
  {
    icon: IconMessageChatbot,
    color: '#60A5FA',
    title: 'AI helpdesk that understands you',
    sub: 'Ask anything naturally — the AI identifies the right department and resolves or escalates for you.',
  },
  {
    icon: IconTicket,
    color: '#34D399',
    title: 'Smart ticket routing',
    sub: 'Tickets are created with full context, urgency, and suggested next steps — no back-and-forth needed.',
  },
  {
    icon: IconLayoutDashboard,
    color: '#FBBF24',
    title: 'Unified for students and staff',
    sub: 'Students track their concerns. Staff see clean, AI-summarized cases ready to act on.',
  },
] as const;

export function Login() {
  const navigate = useNavigate();
  const outerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<AuthMode>('signin');
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
    setError(null);
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
            <div className="login-page__brand-row">
              <div className="login-page__brand-icon">
                <IconBuildingCommunity size={22} aria-hidden />
              </div>
              <span className="login-page__brand-name">Campus360</span>
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

              <div className="login-page__feature-list">
                {FEATURES.map(({ icon: Icon, color, title, sub }) => (
                  <div className="login-page__feature-item" key={title}>
                    <div className="login-page__feature-icon">
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
            <div className="login-page__login-card">
              <div className="login-page__login-header">
                <div className="login-page__login-logo-wrap">
                  <div className="login-page__login-logo-icon">
                    <IconBuildingCommunity size={20} aria-hidden />
                  </div>
                  <span className="login-page__login-logo-text">Campus360</span>
                </div>
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
                  All systems operational · Last updated June 7, 2026
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

                {mode === 'signin' ? (
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
                    <button type="button" className="login-page__forgot-link">
                      Forgot password?
                    </button>
                  </div>
                ) : (
                  <div className="login-page__form-hint login-page__form-hint--spaced">
                    Password must be at least 8 characters.
                  </div>
                )}

                {error && <p className="login-page__error">{error}</p>}

                <button
                  type="submit"
                  className="login-page__login-btn"
                  disabled={
                    loading ||
                    !email.trim() ||
                    !password ||
                    (mode === 'signup' && !name.trim())
                  }
                >
                  <IconLogin size={16} aria-hidden />
                  {loading
                    ? mode === 'signup'
                      ? 'Creating account…'
                      : 'Signing in…'
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
                  <span className="login-page__sso-icon login-page__sso-icon--google" aria-hidden>
                    G
                  </span>
                  {googleEnabled ? 'Sign in with Google' : 'Google (not configured)'}
                </button>
                <button
                  type="button"
                  className="login-page__sso-btn"
                  disabled={!microsoftEnabled}
                  onClick={() => {
                    window.location.href = oauthStartUrl('microsoft', role);
                  }}
                >
                  <span className="login-page__sso-icon login-page__sso-icon--microsoft" aria-hidden>
                    M
                  </span>
                  {microsoftEnabled ? 'Sign in with Microsoft' : 'Microsoft (not configured)'}
                </button>
              </div>
              {!googleEnabled && !microsoftEnabled && (
                <p className="login-page__sso-hint">
                  SSO buttons activate once Google and Microsoft OAuth credentials are added to the backend.
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
  );
}
