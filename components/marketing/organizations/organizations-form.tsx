'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const TEAM_SIZES = ['under_10', '10_25', '25_50', '50_100', '100_plus'] as const;

const inputCls = cn(
  'w-full rounded-[10px] border-[1.5px] border-[var(--m-border-strong)]',
  'bg-[var(--m-white)] px-4 py-3 text-[15px] text-[var(--m-ink-primary)]',
  'outline-none transition-colors',
  'focus:border-[var(--m-accent-teal)] focus:ring-2 focus:ring-[var(--m-accent-teal-soft)]',
  'disabled:opacity-60',
);
const labelCls = 'mb-1.5 block text-[13px] font-semibold text-[var(--m-ink-secondary)]';

export function OrganizationsForm() {
  const t = useTranslations('organizations.form');
  const locale = useLocale();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const form = e.currentTarget;
    const data = new FormData(form);

    setStatus('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/organizations/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.get('full_name'),
          email: data.get('email'),
          organization: data.get('organization'),
          team_size: data.get('team_size') || null,
          about: data.get('about'),
          goal: data.get('goal'),
          company_url: data.get('company_url'), // honeypot
          source_locale: locale === 'ja' ? 'ja' : 'en',
        }),
      });
      if (res.ok) {
        setStatus('success');
        form.reset();
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus('error');
        setErrorMsg(body?.error ?? t('error'));
      }
    } catch {
      setStatus('error');
      setErrorMsg(t('error'));
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-[14px] border-[1.5px] border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.08)] p-7 text-center">
        <p className="mb-1.5 text-[18px] font-bold text-[var(--m-accent-teal)]">
          <span className="mr-1.5">🐢</span>
          {t('success_heading')}
        </p>
        <p className="text-[15px] text-[var(--m-ink-secondary)]">{t('success_body')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — visually hidden, off-screen, not tab-reachable. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Company URL
          <input type="text" name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="org-name">{t('name_label')}</label>
          <input id="org-name" name="full_name" required maxLength={200} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="org-email">{t('email_label')}</label>
          <input id="org-email" name="email" type="email" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="org-org">{t('org_label')}</label>
          <input id="org-org" name="organization" required maxLength={200} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="org-size">{t('team_size_label')}</label>
          <select id="org-size" name="team_size" defaultValue="" className={inputCls}>
            <option value="">{t('team_size_placeholder')}</option>
            {TEAM_SIZES.map((s) => (
              <option key={s} value={s}>
                {t(`team_size_options.${s}` as 'team_size_options.under_10')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="org-about">{t('about_label')}</label>
        <textarea
          id="org-about"
          name="about"
          required
          rows={3}
          maxLength={4000}
          placeholder={t('about_placeholder')}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="org-goal">{t('goal_label')}</label>
        <textarea
          id="org-goal"
          name="goal"
          required
          rows={3}
          maxLength={4000}
          placeholder={t('goal_placeholder')}
          className={inputCls}
        />
      </div>

      {status === 'error' && errorMsg && (
        <p className="text-[13px] text-[var(--m-accent-coral)]">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className={cn(
          'w-full rounded-[10px] bg-[var(--m-accent-teal)] px-6 py-3.5 sm:w-auto',
          'text-[15px] font-bold text-white transition-colors',
          'hover:bg-[var(--m-accent-teal-dark)] disabled:opacity-60',
        )}
      >
        {status === 'submitting' ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
