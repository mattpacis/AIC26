import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CopilotWebChatIframe } from './CopilotWebChatIframe';
import type { CopilotUserContext } from '../config/copilot';

type Props = {
  user?: CopilotUserContext;
  children: ReactNode;
};

type State = {
  failed: boolean;
};

export class CopilotWebChatErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[CopilotWebChat] Direct Line failed, using iframe:', error, info);
  }

  render() {
    if (this.state.failed) {
      return <CopilotWebChatIframe user={this.props.user} />;
    }

    return this.props.children;
  }
}
