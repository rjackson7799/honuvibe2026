'use client';

// "Pay the deposit →" on the accepted band (slice 4, migration 075). POSTs to
// the mint route, which returns a fresh Stripe Checkout URL; on success we
// navigate away, so there is no "success" state to render here.
//
// NO token in the body — the hv_engp_ cookie authorises, and
// begin_engagement_invoice_checkout re-validates its hash on the LOCKED
// proposal row, so a revoke that committed first wins. NO amount either: the
// price is server-set from the immutable invoice row, which is why a leaked
// proposal link can only ever pay Ryan's invoice at Ryan's price.
//
// The button is disabled while navigating so a double click cannot mint twice
// — though it would be harmless if it did: the idempotency key makes the
// second call return the same session.

import { useState } from 'react';
import { T } from './copy';

type Outcome =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'redirecting' }
  | { kind: 'error'; message: string };

export function ProposalDepositButton({
  proposalId,
  locale,
}: {
  proposalId: string;
  locale: 'en' | 'ja';
}) {
  const t = T[locale];
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const busy = outcome.kind === 'submitting' || outcome.kind === 'redirecting';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem('company_url') as HTMLInputElement | null)?.value ?? '';
    setOutcome({ kind: 'submitting' });
    try {
      const res = await fetch(`/api/engagement/proposal/${proposalId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_url: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

      if (res.ok && data.url) {
        setOutcome({ kind: 'redirecting' });
        window.location.assign(data.url);
        return;
      }
      if (res.status === 429) return setOutcome({ kind: 'error', message: t.depositRateLimited });
      // 404 = no deposit is open on this proposal (it was voided, or none was
      // ever requested). That is a state message, not an outage.
      if (res.status === 404) return setOutcome({ kind: 'error', message: t.depositNotOpen });
      if (res.status === 403) return setOutcome({ kind: 'error', message: t.depositForbidden });
      if (res.status === 409) {
        const message =
          data.error === 'already_paid'
            ? t.depositAlreadyPaid
            : data.error === 'payment_pending'
              ? t.depositPaymentPending
              : t.depositNotOpen;
        return setOutcome({ kind: 'error', message });
      }
      setOutcome({ kind: 'error', message: t.depositUnavailable });
    } catch {
      setOutcome({ kind: 'error', message: t.depositUnavailable });
    }
  }

  return (
    <form onSubmit={submit} noValidate data-deposit-form className="space-y-2">
      {/* Honeypot — a real client never sees or fills this. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="deposit-company-url">Company URL</label>
        <input id="deposit-company-url" name="company_url" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <button
        type="submit"
        disabled={busy}
        data-deposit-button
        className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--m-accent-teal)] px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? t.depositButtonBusy : t.depositButton}
      </button>

      <p className="text-[12.5px] text-[var(--m-ink-secondary)]">{t.depositSecureNote}</p>

      {outcome.kind === 'error' && (
        <p role="alert" data-deposit-error className="text-[13px] text-[var(--m-accent-coral)]">
          {outcome.message}
        </p>
      )}
    </form>
  );
}
