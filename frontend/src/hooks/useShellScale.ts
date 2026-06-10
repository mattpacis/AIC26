import { useEffect, useRef } from 'react';

type ShellScaleOptions = {
  designWidth?: number;
  designHeight?: number;
  mobileBreakpoint?: number;
};

export function useShellScale({
  designWidth = 1440,
  designHeight = 1024,
  mobileBreakpoint = 900,
}: ShellScaleOptions = {}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outerEl = outerRef.current;
    const shellEl = shellRef.current;
    if (!outerEl || !shellEl) return;

    const scale = () => {
      if (window.innerWidth <= mobileBreakpoint) {
        shellEl.style.transform = '';
        outerEl.style.height = '';
        return;
      }

      const w = outerEl.clientWidth || 680;
      const s = Math.min(w / designWidth, 1);
      shellEl.style.transform = `scale(${s})`;
      outerEl.style.height = `${Math.round(designHeight * s)}px`;
    };

    scale();
    window.addEventListener('resize', scale);
    return () => window.removeEventListener('resize', scale);
  }, [designWidth, designHeight, mobileBreakpoint]);

  return { outerRef, shellRef };
}
