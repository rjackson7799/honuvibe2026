'use client';

// The client's click-wrap accept (slice 3, slice B). Name (≥16px input,
// maxLength 200) + ONE checkbox ("I accept this proposal on behalf of
// {business}") + a hidden honeypot + Accept. POSTs {accepted_by_name,
// accepted: true, company_url} — NO token: the hv_engp_ cookie authorizes,
// and the accept RPC re-validates its hash on the locked row. On
// applied:true the accepted state renders IN PLACE, honestly worded
// ("recorded", never "notified" — Ryan's email is best-effort in after()).
// 409 already_accepted / not_open, 410 expired, 403 forbidden (session lost
// or link revoked → "open from your email again") and 429 each replace the
// form with the matching card; a network error keeps the form for a retry.
// This is a click-wrap record, not an e-signature product — the line under
// the button says exactly what is recorded.

import { useState } from 'react';
import { CheckCircle2, Clock, KeyRound } from 'lucide-react';
import { T } from './copy';

type Outcome =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'recorded' }
  | { kind: 'already_accepted' }
  | { kind: 'expired' }
  | { kind: 'link_expired' }
  | { kind: 'not_open' }
  | { kind: 'forbidden' }
  | { kind: 'rate_limited' }
  | { kind: 'error' };

export function ProposalAcceptForm({
  proposalId,
  locale,
  businessName,
}: {
  proposalId: string;
  locale: 'en' | 'ja';
  businessName: string;
}) {
  const t = T[locale];
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= 200 && agreed && outcome.kind !== 'submitting';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem('company_url') as HTMLInputElement | null)?.value ?? '';
    setOutcome({ kind: 'submitting' });
    try {
      const res = await fetch(`/api/engagement/proposal/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_by_name: trimmed, accepted: true, company_url: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; applied?: boolean };
      if (res.ok && data.applied) {
        setOutcome({ kind: 'recorded' });
        return;
      }
      if (res.status === 409) {
        setOutcome({ kind: data.error === 'already_accepted' ? 'already_accepted' : 'not_open' });
        return;
      }
      if (res.status === 410) {
        // 'expired' = the proposal's valid_until passed (RPC); 'link_expired' = the 45-day link lapsed (session).
        setOutcome({ kind: data.error === 'link_expired' ? 'link_expired' : 'expired' });
        return;
      }
      if (res.status === 403) {
        setOutcome({ kind: 'forbidden' });
        return;
      }
      if (res.status === 429) {
        setOutcome({ kind: 'rate_limited' });
        return;
      }
      setOutcome({ kind: 'error' });
    } catch {
      setOutcome({ kind: 'error' });
    }
  }

  const card = 'rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-6 shadow-[var(--m-shadow-md)] sm:p-8';

  if (outcome.kind === 'recorded') {
    return (
      <Card icon="ok" title={t.recordedTitle} body={t.recordedBody} />
    );
  }
  if (outcome.kind === 'already_accepted') return <Card icon="ok" title={t.alreadyAcceptedTitle} body={t.alreadyAcceptedBody} />;
  if (outcome.kind === 'expired') return <Card icon="clock" title={t.expiredTitle} body={t.expiredBody} />;
  if (outcome.kind === 'link_expired') return <Card icon="clock" title={t.linkExpiredTitle} body={t.linkExpiredBody} />;
  if (outcome.kind === 'not_open') return <Card icon="key" title={t.notOpenTitle} body={t.notOpenBody} />;
  if (outcome.kind === 'forbidden') return <Card icon="key" title={t.forbiddenTitle} body={t.forbiddenBody} />;
  if (outcome.kind === 'rate_limited') return <Card icon="clock" title={t.rateLimitedTitle} body={t.rateLimitedBody} />;

  const submitting = outcome.kind === 'submitting';

  return (
    <form id="accept" onSubmit={submit} className={card} noValidate>
      <h2 className="text-[20px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">{t.acceptTitle}</h2>
      <p className="mt-1.5 text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">{t.acceptIntro(businessName)}</p>

      <div className="mt-5">
        <label htmlFor="accepted_by_name" className="block text-[13.5px] font-semibold text-[var(--m-ink-primary)]">
          {t.nameLabel}
        </label>
        <input
          id="accepted_by_name"
          name="accepted_by_name"
          type="text"
          value={name}
          maxLength={200}
          autoComplete="name"
          placeholder={t.namePlaceholder}
          disabled={submitting}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 block w-full rounded-[10px] border border-[var(--m-border-strong)] bg-[var(--m-white)] px-3.5 py-3 text-[16px] text-[var(--m-ink-primary)] placeholder:text-[var(--m-ink-secondary)]/70 focus:border-[var(--m-accent-teal)] focus:outline-none"
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14.5px] leading-[1.7] text-[var(--m-ink-primary)]">
        <input
          type="checkbox"
          name="accepted"
          checked={agreed}
          disabled={submitting}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--m-accent-teal)]"
        />
        <span>{t.checkboxLabel(businessName)}</span>
      </label>

      {/* Honeypot — bots fill it, humans never see it. */}
      <input type="text" name="company_url" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" defaultValue="" />

      {outcome.kind === 'error' ? (
        <div role="alert" className="mt-4 rounded-[12px] border border-[rgba(232,118,90,0.4)] bg-[rgba(232,118,90,0.08)] px-4 py-3 text-[14px] text-[var(--m-ink-primary)]">
          {t.errorBody}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-[10px] bg-[var(--m-accent-teal)] px-6 text-[15px] font-bold text-white transition-colors hover:bg-[var(--m-accent-teal-dark)] disabled:opacity-60 sm:w-auto"
      >
        {submitting ? t.accepting : t.acceptButton}
      </button>
      <p className="mt-3 text-[12.5px] leading-[1.6] text-[var(--m-ink-secondary)]">{t.clickWrapNote}</p>
    </form>
  );
}

function Card({ icon, title, body }: { icon: 'ok' | 'clock' | 'key'; title: string; body: string }) {
  const teal = icon === 'ok';
  return (
    <div role="status" className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 text-center shadow-[var(--m-shadow-md)]">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: teal ? 'rgba(15,169,160,0.1)' : 'rgba(232,118,90,0.10)' }}>
        {icon === 'ok' ? (
          <CheckCircle2 size={28} strokeWidth={2} style={{ color: 'var(--m-accent-teal)' }} />
        ) : icon === 'clock' ? (
          <Clock size={28} strokeWidth={2} style={{ color: 'var(--m-accent-coral)' }} />
        ) : (
          <KeyRound size={28} strokeWidth={2} style={{ color: 'var(--m-accent-coral)' }} />
        )}
      </div>
      <h2 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">{title}</h2>
      <p className="text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">{body}</p>
    </div>
  );
}
