'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { discoverPath } from './paths';

// Error bodies are not always JSON (platform 5xx pages); never show a parser error.
async function readError(res: Response): Promise<{ error?: string }> {
  return res.json().catch(() => ({}));
}

// The code input works before a send: after a reload the user may already hold a code.
export function OtpVerify({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendCode() {
    if (sending || submitting) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/discover/verify/${sessionId}/send`, { method: 'POST' });
      const body = await readError(res);
      if (!res.ok) throw new Error(body.error || 'Could not send the code.');
      setSent(true);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || sending) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/discover/verify/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = await readError(res);
      if (!res.ok) throw new Error(body.error || 'Could not verify.');
      router.push(discoverPath(`/discover/${sessionId}/complete`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="dsc-center">
      <p className="dsc-stepmark">Almost there</p>
      <h1 className="dsc-q__head">Confirm your email to see your results.</h1>
      <p className="dsc-q__sub">
        {sent ? 'Enter the 6-digit code sent to your email. It expires in 10 minutes.' : 'Request a verification code at the email address you provided. Already have a code? Enter it below.'}
      </p>

      <form onSubmit={onSubmit} className="dsc-form">
        <button type="button" className="dsc-btn" onClick={sendCode} disabled={sending || submitting}>
          {sending ? 'Sending…' : sent ? 'Resend code' : 'Send verification code'}
        </button>
        <input
          className="dsc-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Email verification code"
          disabled={sending || submitting}
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          style={{ maxWidth: 220, fontSize: 22, letterSpacing: '0.3em', textAlign: 'center' }}
        />
        {error && <p className="dsc-error" role="alert">{error}</p>}
        <div style={{ marginTop: 20 }}>
          <button type="submit" className="dsc-btn dsc-btn--primary" disabled={sending || submitting}>
            {submitting ? 'Verifying…' : 'Verify & see my plan'} <span aria-hidden>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
