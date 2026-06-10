import { useState } from 'react';
import { sendMessage } from '../api/client';

export function Home() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await sendMessage(trimmed, sessionId);
      setReply(response.reply);
      setSessionId(response.sessionId);
      setMessage('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reach the backend',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="home">
      <h1>Welcome to AIC26</h1>
      <p>
        Replace this page with components converted from your HTML files. The
        chat form below is wired to <code>/api/chat</code> once the backend
        exists.
      </p>

      <form className="chat-form" onSubmit={handleSubmit}>
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message for the AI agent... (Shift+Enter for new line)"
          rows={3}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.shiftKey) return;
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit(event);
            }
          }}
        />
        <button type="submit" disabled={loading || !message.trim()}>
          {loading ? 'Sending…' : 'Send'}
        </button>
      </form>

      {error && <p className="chat-form__error">{error}</p>}
      {reply && (
        <div className="chat-form__reply">
          <strong>Agent:</strong> {reply}
        </div>
      )}
    </section>
  );
}
