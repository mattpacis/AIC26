import { useEffect, useState } from 'react';
import './Campus360Logo.css';

const LOGO_SUFFIXES = [
  '360',
  'Care',
  'Help',
  'Hub',
  'Assist',
  'Desk',
  'Guide',
  'Support',
] as const;
const SUFFIX_STEP_EM = 1;
const LOGIN_SUFFIX_STEP_EM = 1.14;

type Campus360LogoVariant = 'sidebar' | 'sidebar-staff' | 'login' | 'light';

type Campus360LogoProps = {
  variant?: Campus360LogoVariant;
  className?: string;
  animate?: boolean;
};

export function Campus360Logo({
  variant = 'sidebar',
  className = '',
  animate = false,
}: Campus360LogoProps) {
  const [suffixIndex, setSuffixIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyPreference = () => {
      setPrefersReducedMotion(reducedMotion.matches);
    };

    applyPreference();
    if (typeof reducedMotion.addEventListener === 'function') {
      reducedMotion.addEventListener('change', applyPreference);
      return () => reducedMotion.removeEventListener('change', applyPreference);
    }

    reducedMotion.addListener(applyPreference);
    return () => reducedMotion.removeListener(applyPreference);
  }, []);

  const motionEnabled = animate && !prefersReducedMotion;

  useEffect(() => {
    if (!motionEnabled) return;

    const interval = window.setInterval(() => {
      setSuffixIndex((current) => (current + 1) % LOGO_SUFFIXES.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [motionEnabled]);

  const activeSuffix = motionEnabled ? LOGO_SUFFIXES[suffixIndex] : '360';
  const suffixStepEm = variant === 'login' ? LOGIN_SUFFIX_STEP_EM : SUFFIX_STEP_EM;

  return (
    <div className={`c360-logo c360-logo--${variant} ${className}`.trim()}>
      <span className="c360-logo__wordmark" aria-label={`Campus${activeSuffix}`}>
        <span className="c360-logo__prefix">Campus</span>
        <span className="c360-logo__suffix-window" aria-hidden>
          {motionEnabled ? (
            <span
              className="c360-logo__suffix-track"
              style={{ transform: `translateY(-${suffixIndex * suffixStepEm}em)` }}
            >
              {LOGO_SUFFIXES.map((suffix, index) => (
                <span
                  className={`c360-logo__suffix${
                    suffix === '360' ? ' c360-logo__suffix--title' : ''
                  }${index === suffixIndex ? ' c360-logo__suffix--active' : ''}`}
                  key={suffix}
                >
                  {suffix}
                </span>
              ))}
            </span>
          ) : (
            <span className="c360-logo__suffix c360-logo__suffix--static">360</span>
          )}
        </span>
      </span>
    </div>
  );
}
