import { useCallback, useState } from 'react';
import { COPILOT_CHAT_MODE, type CopilotUserContext } from '../config/copilot';
import { CopilotWebChatDirectLine } from './CopilotWebChatDirectLine';
import { CopilotWebChatErrorBoundary } from './CopilotWebChatErrorBoundary';
import { CopilotWebChatIframe } from './CopilotWebChatIframe';

type CopilotWebChatProps = {
  user?: CopilotUserContext;
};

export function CopilotWebChat({ user }: CopilotWebChatProps) {
  const [useIframe, setUseIframe] = useState(COPILOT_CHAT_MODE === 'iframe');

  const handleFallback = useCallback((reason: string) => {
    console.warn('[CopilotWebChat] Falling back to iframe embed:', reason);
    setUseIframe(true);
  }, []);

  if (useIframe) {
    return <CopilotWebChatIframe user={user} />;
  }

  return (
    <CopilotWebChatErrorBoundary user={user}>
      <CopilotWebChatDirectLine user={user} onFallback={handleFallback} />
    </CopilotWebChatErrorBoundary>
  );
}
