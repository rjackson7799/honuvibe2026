'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEventRsvp } from '@/lib/analytics';

/**
 * Registration form for a PUBLIC / FREE event (confirm-to-hold). Captures name +
 * email + referral + newsletter opt-in and POSTs to /api/events/rsvp, which
 * creates a PENDING row and emails a confirm link. The seat is held only after
 * the registrant confirms. Distinct from PublicEventRsvp (legacy email-only) and
 * the invite-only EventRsvp.
 */

// Keep in sync with REFERRAL_SOURCES in app/api/events/rsvp/route.ts.
const REFERRAL_OPTIONS = [
  'newsletter',
  'linkedin',
  'friend',
  'twitter_x',
  'search',
  'website',
] as const;
type Referral = (typeof REFERRAL_OPTIONS)[number];

type Status = 'idle' | 'loading' | 'pending' | 'already' | 'error' | 'full';

const inputBase =
  'w-full rounded-[9px] border-[1.5px] border-[rgba(26,43,51,0.13)] bg-[var(--m-white)] px-4 py-[13px] text-[16px] text-[var(--m-ink-primary)] placeholder:text-[var(--m-ink-tertiary)] outline-none transition-colors focus:border-[var(--m-accent-teal)] focus:ring-2 focus:ring-[rgba(15,169,160,0.2)] disabled:opacity-60';

const labelBase =
  'mb-2 block text-[12.5px] font-semibold tracking-[0.02em] text-[var(--m-ink-primary)]';

export function EventRegistrationForm({
  eventSlug,
  locale,
  capacity,
  seatsLeft,
}: {
  eventSlug: string;
  locale: 'en' | 'ja';
  capacity: number;
  seatsLeft: number;
}) {
  const t = useTranslations('public_events');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [referral, setReferral] = useState<Referral | null>(null);
  const [newsletter, setNewsletter] = useState(false);
  const [companyUrl, setCompanyUrl] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>(seatsLeft <= 0 ? 'full' : 'idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_slug: eventSlug,
          full_name: fullName,
          email,
          referral_source: referral ?? '',
          newsletter_opt_in: newsletter,
          source_locale: locale,
          company_url: companyUrl,
        }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { alreadyConfirmed?: boolean }
          | null;
        setStatus(data?.alreadyConfirmed ? 'already' : 'pending');
        // event_slug + locale only — never the captured name/email.
        trackEventRsvp({ event_slug: eventSlug, locale });
      } else if (res.status === 429) {
        setStatus('error');
        setErrorMsg(t('throttle_error'));
      } else if (res.status === 403) {
        setStatus('error');
        setErrorMsg(t('closed_error'));
      } else {
        setStatus('error');
        setErrorMsg(t('rsvp_error'));
      }
    } catch {
      setStatus('error');
      setErrorMsg(t('rsvp_error'));
    }
  }

  if (status === 'pending') {
    return (
      <div className="rounded-[16px] border-[1.5px] border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.07)] p-6 text-center md:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(15,169,160,0.14)]">
          <Mail size={26} strokeWidth={2} className="text-[var(--m-accent-teal)]" />
        </div>
        <h3 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
          {t('pending_title')}
        </h3>
        <p className="text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">
          {t('pending_body')}
        </p>
        <p className="mt-3 text-[13px] text-[var(--m-ink-tertiary)]">{t('resend_hint')}</p>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="rounded-[16px] border-[1.5px] border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.07)] p-6 text-center md:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(15,169,160,0.14)]">
          <Check size={26} strokeWidth={2} className="text-[var(--m-accent-teal)]" />
        </div>
        <h3 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
          {t('already_title')}
        </h3>
        <p className="text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">
          {t('already_body')}
        </p>
      </div>
    );
  }

  if (status === 'full') {
    return (
      <div className="rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-sand)] p-6 text-center md:p-8">
        <h3 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
          {t('full_title')}
        </h3>
        <p className="text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">{t('full_body')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[clamp(22px,2.4vw,28px)] font-bold tracking-[-0.02em] text-[var(--m-ink-primary)]">
        {t('reserve_heading')}
      </h2>
      <p className="mt-1.5 text-[14px] text-[var(--m-ink-secondary)]">
        {t('reserve_subtext', { capacity })}
        {seatsLeft <= 20 ? (
          <>
            {' · '}
            <span className="font-semibold text-[var(--m-accent-coral)]">
              {t('seats_left', { count: seatsLeft })}
            </span>
          </>
        ) : null}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        {/* Honeypot — visually hidden, must stay empty. */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="rsvp-company-url">Company URL</label>
          <input
            id="rsvp-company-url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="rsvp-name" className={labelBase}>
            {t('form_name_label')}
          </label>
          <input
            id="rsvp-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('form_name_placeholder')}
            disabled={status === 'loading'}
            className={inputBase}
          />
        </div>

        <div>
          <label htmlFor="rsvp-email" className={labelBase}>
            {t('form_email_label')}
          </label>
          <input
            id="rsvp-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('form_email_placeholder')}
            disabled={status === 'loading'}
            className={inputBase}
          />
        </div>

        <div>
          <span className={labelBase}>{t('referral_question')}</span>
          <div className="flex flex-wrap gap-2">
            {REFERRAL_OPTIONS.map((opt) => {
              const selected = referral === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setReferral(selected ? null : opt)}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors',
                    selected
                      ? 'border-[var(--m-accent-teal)] bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]'
                      : 'border-[rgba(26,43,51,0.16)] text-[var(--m-ink-secondary)] hover:border-[var(--m-ink-primary)]',
                  )}
                >
                  {t(`referral_${opt}`)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--m-accent-teal)]"
          />
          {t('newsletter_opt_in')}
        </label>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--m-accent-teal)] px-7 py-4 text-[16px] font-bold text-white shadow-[var(--m-shadow-teal-sm)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--m-accent-teal-dark)] hover:shadow-[var(--m-shadow-teal-md)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
              {t('form_submitting')}
            </>
          ) : (
            <>
              {t('form_submit')}
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>

        <p className="text-center text-[11.5px] leading-snug text-[var(--m-ink-tertiary)]">
          {t('consent_copy')}
        </p>

        {status === 'error' && errorMsg && (
          <p role="alert" aria-live="assertive" className="text-center text-[14px] text-[var(--m-accent-coral)]">
            {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
}
