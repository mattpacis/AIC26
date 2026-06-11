import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Campus360Logo } from '../components/Campus360Logo';
import { getMe } from '../api/client';
import { usePageTitle } from '../hooks/usePageTitle';
import './Login.css';

export function OAuthCallback() {
  usePageTitle('Signing in');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    const error = params.get('error');
    if (error) {
      setMessage(error);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { user } = await getMe();
        if (cancelled) return;

        const next = params.get('next');
        if (next?.startsWith('/')) {
          navigate(next, { replace: true });
          return;
        }

        navigate(
          user.role === 'staff' ? '/staff-dashboard' : '/dashboard',
          { replace: true },
        );
      } catch {
        if (!cancelled) {
          setMessage('Sign-in could not be completed. Return to the login page and try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="login-page">
      <div className="login-page__outer" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="login-page__login-card" style={{ width: 'min(420px, 92vw)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Campus360Logo variant="light" />
          </div>
          <h2 className="login-page__login-title">Signing in</h2>
          <p className="login-page__login-sub">{message}</p>
          {params.get('error') && (
            <button
              type="button"
              className="login-page__login-btn"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
