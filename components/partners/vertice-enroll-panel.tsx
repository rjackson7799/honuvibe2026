'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Lock, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

export function VerticeEnrollPanel() {
  const t = useTranslations('vertice');
  const locale = useLocale();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const localePrefix = locale === 'ja' ? '/ja' : '';
  const checkoutUrl = `${localePrefix}/learn/ai-essentials/checkout`;

  const inputClasses =
    'h-12 w-full rounded-lg bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)] font-mono tracking-widest uppercase';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/vertice/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error === 'invalid_code') {
          setError(t('enroll.invalid_code'));
        } else if (result.error === 'rate_limit') {
          setError(t('errors.rate_limit'));
        } else {
          setError(t('errors.server_error'));
        }
        setLoading(false);
        return;
      }

      trackEvent('vertice_enroll_click', { locale });
      router.push(checkoutUrl);
    } catch {
      setError(t('errors.server_error'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vertice-code" className="text-sm font-medium text-fg-secondary flex items-center gap-1.5">
          <Lock size={13} className="text-fg-tertiary" />
          {t('enroll.access_code_label')}
        </label>
        <input
          id="vertice-code"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t('enroll.access_code_placeholder')}
          className={inputClasses}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="h-12 w-full rounded-lg bg-accent-teal text-white font-medium text-base flex items-center justify-center gap-2 hover:bg-accent-teal-hover disabled:opacity-50 disabled:pointer-events-none transition-colors duration-[var(--duration-fast)]"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t('enroll.submitting')}
          </>
        ) : (
          <>
            {t('enroll.submit')}
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p className="text-xs text-fg-tertiary text-center lg:text-left">
        {t('enroll.note')}
      </p>
    </form>
  );
}
