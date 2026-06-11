import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import './ToastProvider.css';

export type ToastTone = 'info' | 'success' | 'error';

export type ToastInput = {
  title: string;
  body?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastRecord = ToastInput & { id: string };

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID();
      const record: ToastRecord = {
        id,
        tone: toast.tone ?? 'info',
        durationMs: toast.durationMs ?? 5200,
        title: toast.title,
        body: toast.body,
      };

      setToasts((current) => [...current.slice(-4), record]);

      const timer = window.setTimeout(() => dismiss(id), record.durationMs);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="c360-toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`c360-toast c360-toast--${toast.tone ?? 'info'}`}
            role="status"
          >
            <div className="c360-toast__icon" aria-hidden>
              {toast.tone === 'success' ? (
                <IconCheck size={16} />
              ) : (
                <IconInfoCircle size={16} />
              )}
            </div>
            <div className="c360-toast__copy">
              <strong>{toast.title}</strong>
              {toast.body && <span>{toast.body}</span>}
            </div>
            <button
              type="button"
              className="c360-toast__close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
