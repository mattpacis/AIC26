import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactWebChat } from 'botframework-webchat/component.js';
import { DirectLine } from 'botframework-directlinejs';
import { IconExternalLink } from '@tabler/icons-react';
import { getCopilotDirectLineToken } from '../api/client';
import { openCopilotChat, type CopilotUserContext } from '../config/copilot';
import {
  createCopilotDirectLineStore,
  isHiddenCampus360Activity,
} from './copilotDirectLineStore';

// Render filter: identity messages reach Copilot but never show a chat bubble.
const activityMiddleware =
  () =>
  (next: (card: unknown) => unknown) =>
  (card: { activity?: { channelData?: Record<string, unknown> } }) => {
    if (isHiddenCampus360Activity(card?.activity)) {
      return false;
    }
    return next(card);
  };

type CopilotWebChatDirectLineProps = {
  user?: CopilotUserContext;
  onFallback?: (reason: string) => void;
};

type DirectLineSession = {
  token: string;
  userId: string;
  email: string;
  name: string;
  campus360Token: string;
};

function createDirectLine(token: string) {
  return new DirectLine({ token });
}

export function CopilotWebChatDirectLine({
  user,
  onFallback,
}: CopilotWebChatDirectLineProps) {
  const [session, setSession] = useState<DirectLineSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedForUserIdRef = useRef<string | null>(null);
  const fallbackReportedRef = useRef(false);
  const onFallbackRef = useRef(onFallback);
  onFallbackRef.current = onFallback;

  const userId = user?.id;
  const userEmail = user?.email;
  const userName = user?.name;

  useEffect(() => {
    if (!userId || !userEmail || !userName) {
      loadedForUserIdRef.current = null;
      setSession(null);
      setError(null);
      return;
    }

    if (loadedForUserIdRef.current === userId) {
      return;
    }

    loadedForUserIdRef.current = null;
    fallbackReportedRef.current = false;
    setSession(null);

    const stableUserId = userId;
    const stableUserName = userName;
    let cancelled = false;

    async function loadDirectLineSession() {
      setLoading(true);
      setError(null);

      try {
        const response = await getCopilotDirectLineToken();
        if (cancelled) {
          return;
        }

        loadedForUserIdRef.current = stableUserId;
        setSession({
          token: response.token,
          userId: response.userId,
          email: response.email,
          name: stableUserName,
          campus360Token: response.campus360Token,
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof Error ? err.message : 'Direct Line chat failed to load';
        setError(message);
        setSession(null);

        if (!fallbackReportedRef.current) {
          fallbackReportedRef.current = true;
          onFallbackRef.current?.(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDirectLineSession();

    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, userName]);

  const activeUser = useMemo<CopilotUserContext | undefined>(() => {
    if (!session) {
      return user;
    }
    return {
      id: session.userId,
      email: session.email,
      name: session.name,
      token: session.campus360Token,
    };
  }, [session, user]);

  const directLine = useMemo(() => {
    if (!session?.token) {
      return null;
    }
    return createDirectLine(session.token);
  }, [session?.token]);

  const store = useMemo(() => {
    if (!session) {
      return undefined;
    }
    return createCopilotDirectLineStore({
      campus360UserId: session.userId,
      campus360Email: session.email,
      campus360Token: session.campus360Token,
    });
  }, [session]);

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
        {loading && (
          <p className="copilot-webchat__status">Connecting to Copilot…</p>
        )}
        {error && (
          <p className="copilot-webchat__status copilot-webchat__status--error">
            {error}
          </p>
        )}
        {directLine && store && (
          <div className="copilot-webchat__webchat-host">
            <ReactWebChat
              directLine={directLine}
              store={store}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              activityMiddleware={activityMiddleware as any}
            />
          </div>
        )}
      </div>
    </div>
  );
}
