import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import './ErrorBoundary.css';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Campus360 UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="c360-error-boundary">
          <div className="c360-error-boundary__card">
            <div className="c360-error-boundary__icon" aria-hidden>
              <IconAlertTriangle size={28} />
            </div>
            <h1>Something went wrong</h1>
            <p>
              The page hit an unexpected error. Try refreshing, or return to the
              dashboard.
            </p>
            <div className="c360-error-boundary__actions">
              <button type="button" onClick={() => window.location.reload()}>
                Refresh page
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
