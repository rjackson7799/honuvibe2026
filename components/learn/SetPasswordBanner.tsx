'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

const DISMISS_KEY = 'honuvibe-set-password-banner-dismissed';

export function SetPasswordBanner() {
  const t = useTranslations('welcome');
  const locale = useLocale();
  const [hidden, setHidden] = useState(true);

  // Render after mount to read sessionStorage without a hydration mismatch.
  useEffect(() => {
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    setHidden(dismissed);
  }, []);

  if (hidden) return null;

  const prefix = locale === 'ja' ? '/ja' : '';

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setHidden(true);
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-md border border-border-primary bg-bg-secondary px-4 py-3 text-sm"
    >
      <p className="text-fg-secondary">
        {t('banner_body')}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`${prefix}/learn/dashboard/settings`}
          className="text-accent-teal hover:underline whitespace-nowrap"
        >
          {t('banner_cta')}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-fg-tertiary hover:text-fg-secondary px-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}
