'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { HvHeading } from './heading';

type NewsletterBandProps = {
  /** Tag sent to /api/newsletter/subscribe so Beehiiv can attribute the signup (e.g. "home", "learn"). */
  source: string;
  /** Optional eyebrow above the heading (the Learn page shows "Weekly newsletters"). */
  eyebrow?: string;
  className?: string;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * README "Newsletter (Join the wave.)": dark green card, email field and an
 * amber Subscribe button; on success the form is replaced by a thank-you line.
 * Posts to the existing /api/newsletter/subscribe route (one Beehiiv
 * publication). The design's two "letters" checkboxes collapse into `source`.
 */
export function HvNewsletterBand({ source, eyebrow, className }: NewsletterBandProps) {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus('error');
        setErrorMsg(data?.error ?? t('error'));
      }
    } catch {
      setStatus('error');
      setErrorMsg(t('error'));
    }
  }

  return (
    <div
      id="newsletter"
      className={cn(
        'grid items-center gap-6 rounded-[16px] bg-hv-green-900 p-7 text-hv-sand-100 md:p-9',
        '[grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]',
        className,
      )}
    >
      <div>
        {eyebrow && <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-hv-amber">{eyebrow}</p>}
        <HvHeading level="h2-sm" className="text-[30px]">
          {t('hv_heading')}
        </HvHeading>
        <p className="mt-2.5 max-w-[44ch] text-[15.5px] leading-[1.6] text-hv-green-200">{t('hv_body')}</p>
      </div>

      {status === 'success' ? (
        <p role="status" className="text-[16px] text-hv-sand-100">
          {t('hv_success')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2.5" aria-label={t('hv_heading')}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('hv_placeholder')}
            aria-label={t('email_label')}
            disabled={status === 'submitting'}
            className={cn(
              'min-h-[52px] flex-[1_1_220px] rounded-[10px] border-[1.5px] border-hv-green-600 bg-hv-green-800 px-4',
              'text-[16px] text-hv-sand-100 outline-none placeholder:text-hv-green-400',
              'focus:border-hv-amber disabled:opacity-60',
            )}
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className={cn(
              'min-h-[52px] rounded-[10px] bg-hv-amber px-[22px] text-[16px] font-semibold text-hv-green-900',
              'transition-[transform,box-shadow] duration-[250ms] ease-hv hover:-translate-y-0.5 hover:shadow-hv-cta',
              'disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
            )}
          >
            {t('cta')}
          </button>
          {status === 'error' && errorMsg && (
            <p role="alert" className="basis-full text-[13.5px] text-hv-amber">
              {errorMsg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
