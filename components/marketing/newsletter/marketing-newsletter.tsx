'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * Marketing newsletter band — appears on every public page above the footer.
 * Posts to the existing /api/newsletter/subscribe route (Beehiiv integration);
 * does NOT duplicate the API.
 *
 * Visual: gradient teal-sand-coral background, centered narrow card.
 * On submit success: replaces form with a teal confirmation card.
 */
export function MarketingNewsletter() {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
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
        body: JSON.stringify({ email }),
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
    <section
      id="newsletter"
      className={cn(
        'border-t border-[rgba(15,169,160,0.12)] px-5 py-20 md:px-8 md:py-24',
        'bg-[linear-gradient(135deg,rgba(15,169,160,0.06)_0%,var(--m-sand)_50%,rgba(232,118,90,0.06)_100%)]',
      )}
    >
      <div className="mx-auto max-w-[560px] text-center">
        <h2 className="mb-3 text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--m-ink-primary)]">
          {t('marketing_heading')}
        </h2>
        <p className="mb-9 text-[17px] leading-[1.65] text-[var(--m-ink-secondary)]">
          {t('marketing_description')}
        </p>

        {status === 'success' ? (
          <div className="rounded-[14px] border-[1.5px] border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.08)] p-6">
            <p className="mb-1.5 text-[18px] font-bold text-[var(--m-accent-teal)]">
              <span className="mr-1.5">🐢</span>
              {t('marketing_success_title')}
            </p>
            <p className="text-[15px] text-[var(--m-ink-secondary)]">
              {t('marketing_success_body')}
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-2.5 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('marketing_placeholder')}
                disabled={status === 'submitting'}
                aria-label={t('marketing_placeholder')}
                className={cn(
                  'flex-1 rounded-[10px] border-[1.5px] border-[var(--m-border-strong)]',
                  'bg-[var(--m-white)] px-4 py-3.5 text-[15px] text-[var(--m-ink-primary)]',
                  'outline-none transition-colors',
                  'focus:border-[var(--m-accent-teal)] focus:ring-2 focus:ring-[var(--m-accent-teal-soft)]',
                  'disabled:opacity-60',
                )}
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className={cn(
                  'shrink-0 rounded-[10px] bg-[var(--m-accent-teal)] px-6 py-3.5',
                  'text-[15px] font-bold text-white transition-colors',
                  'hover:bg-[var(--m-accent-teal-dark)] disabled:opacity-60',
                )}
              >
                {t('cta')}
              </button>
            </form>
            {status === 'error' && errorMsg && (
              <p className="mb-3 text-[13px] text-[var(--m-accent-coral)]">{errorMsg}</p>
            )}
            <a
              href="https://www.skool.com/honuvibe"
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-[rgba(90,107,115,0.3)] pb-0.5 text-[14px] text-[var(--m-ink-secondary)] transition-colors hover:text-[var(--m-ink-primary)]"
            >
              {t('marketing_skool_cta')}
            </a>
          </>
        )}
      </div>
    </section>
  );
}
