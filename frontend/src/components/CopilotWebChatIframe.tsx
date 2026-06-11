import { useEffect, useRef, useState } from 'react';
import { IconExternalLink, IconX } from '@tabler/icons-react';
import { getCopilotEmbedToken } from '../api/client';
import {
  buildCopilotWebChatUrl,
  openCopilotChat,
  type CopilotUserContext,
} from '../config/copilot';

type CopilotWebChatIframeProps = {
  user?: CopilotUserContext;
};

export function CopilotWebChatIframe({ user }: CopilotWebChatIframeProps) {
  const [embedUrl, setEmbedUrl] = useState(() => buildCopilotWebChatUrl(user));
  const [hintDismissed, setHintDismissed] = useState(false);
  const [sessionUser, setSessionUser] = useState<CopilotUserContext | undefined>(
    user,
  );
  const loadedForUserIdRef = useRef<string | null>(null);

  const userId = user?.id;
  const userEmail = user?.email;
  const userName = user?.name;

  useEffect(() => {
    if (!userId || !userEmail || !userName) {
      loadedForUserIdRef.current = null;
      setSessionUser(undefined);
      setEmbedUrl(buildCopilotWebChatUrl());
      return;
    }

    if (loadedForUserIdRef.current === userId) {
      return;
    }

    const stableUserId = userId;
    const stableUserEmail = userEmail;
    const stableUserName = userName;
    let cancelled = false;

    async function loadEmbedSession() {
      try {
        const session = await getCopilotEmbedToken();
        if (cancelled) return;

        const nextUser: CopilotUserContext = {
          id: session.userId,
          email: session.email,
          name: stableUserName,
          token: session.token,
        };
        loadedForUserIdRef.current = stableUserId;
        setSessionUser(nextUser);
        setEmbedUrl(buildCopilotWebChatUrl(nextUser));
      } catch {
        if (!cancelled) {
          loadedForUserIdRef.current = stableUserId;
          setSessionUser({
            id: stableUserId,
            email: stableUserEmail,
            name: stableUserName,
          });
          setEmbedUrl(
            buildCopilotWebChatUrl({
              id: stableUserId,
              email: stableUserEmail,
              name: stableUserName,
            }),
          );
        }
      }
    }

    void loadEmbedSession();

    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, userName]);

  const activeUser = sessionUser ?? user;

  return (
    <div className="copilot-webchat">
      <div className="copilot-webchat__toolbar">
        <p className="copilot-webchat__account-hint">
          Signed in as <strong>{activeUser?.name ?? 'Student'}</strong>
          {activeUser?.email ? ` (${activeUser.email})` : ''}. Copilot actions use
          this account.
        </p>
        <button
          type="button"
          className="copilot-webchat__open-btn copilot-webchat__open-btn--compact"
          onClick={() => openCopilotChat(activeUser)}
        >
          <IconExternalLink size={14} aria-hidden />
          Open
        </button>
      </div>

      <div className="copilot-webchat__embed-wrap">
        {!hintDismissed && (
          <div className="copilot-webchat__embed-hint">
            <p>
              Blank chat? Click <strong>Open</strong> to use the popup window.
            </p>
            <button
              type="button"
              className="copilot-webchat__embed-hint-dismiss"
              onClick={() => setHintDismissed(true)}
              aria-label="Dismiss hint"
            >
              <IconX size={14} aria-hidden />
            </button>
          </div>
        )}
        <iframe
          key={userId ?? 'anonymous'}
          src={embedUrl}
          title="Campus360 Copilot"
          className="copilot-webchat__frame"
          allow="microphone; geolocation"
        />
      </div>
    </div>
  );
}
