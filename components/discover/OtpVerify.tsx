'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { discoverPath } from './paths';

// Email OTP verification. STUB (Increment 1): any 6-digit code is accepted (the
// /verify route doesn't send or check a real code yet). Copy is written as if
// real so the flow reads correctly; the Resend integration drops in behind it.
export function OtpVerify({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (!res.ok) throw new Error();
      router.push(discoverPath(`/discover/${sessionId}/complete`));
    } catch {
      setError('Could not verify. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="dsc-center">
      <p className="dsc-stepmark">Almost there</p>
      <h1 className="dsc-q__head">Confirm your email to see your results.</h1>
      <p className="dsc-q__sub">
        We&rsquo;ll send a copy of your plan too. Enter the 6-digit code we just sent.
      </p>

      <form onSubmit={onSubmit} className="dsc-form">
        <input
          className="dsc-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          style={{ maxWidth: 220, fontSize: 22, letterSpacing: '0.3em', textAlign: 'center' }}
        />
        {error && <p className="dsc-error">{error}</p>}
        <p className="dsc-price__tier-desc" style={{ marginTop: 4 }}>
          Demo build: any 6 digits will work.
        </p>
        <div style={{ marginTop: 20 }}>
          <button type="submit" className="dsc-btn dsc-btn--primary" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify & see my plan'} <span aria-hidden>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
