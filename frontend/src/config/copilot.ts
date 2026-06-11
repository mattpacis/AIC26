const DEFAULT_COPILOT_WEBCHAT_URL =
  'https://copilotstudio.microsoft.com/environments/0d31fe4e-ca22-e25d-8b85-251866508489/bots/crb3f_Campus360Orchestrator/webchat?__version__=2';

export const COPILOT_WEBCHAT_URL =
  import.meta.env.VITE_COPILOT_WEBCHAT_URL?.trim() || DEFAULT_COPILOT_WEBCHAT_URL;

/** `directline` (default) auto-sends identity invisibly; set VITE_COPILOT_CHAT_MODE=iframe to force the legacy embed. */
export const COPILOT_CHAT_MODE =
  import.meta.env.VITE_COPILOT_CHAT_MODE?.trim().toLowerCase() === 'iframe'
    ? 'iframe'
    : 'directline';

export type CopilotUserContext = {
  id: string;
  email: string;
  name: string;
  token?: string;
};

export function buildCopilotWebChatUrl(user?: CopilotUserContext) {
  const url = new URL(COPILOT_WEBCHAT_URL);
  if (user?.id) {
    url.searchParams.set('campus360UserId', user.id);
  }
  if (user?.email) {
    url.searchParams.set('campus360Email', user.email);
  }
  if (user?.token) {
    url.searchParams.set('campus360Token', user.token);
  }
  return url.toString();
}

export function openCopilotChat(user?: CopilotUserContext) {
  const chatUrl = buildCopilotWebChatUrl(user);
  const width = Math.min(420, window.screen.availWidth - 48);
  const height = Math.min(720, window.screen.availHeight - 48);
  const left = Math.max(0, Math.round(window.screen.availWidth - width - 24));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;

  const popup = window.open(chatUrl, 'campus360-copilot', features);

  if (!popup) {
    window.open(chatUrl, '_blank');
    return;
  }

  popup.focus();
}
