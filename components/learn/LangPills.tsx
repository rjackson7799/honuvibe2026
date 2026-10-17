'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname as useI18nPathname, getPathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * EN / 日本語 locale switcher for the member area, styled as filled-teal pills to
 * match the top bar's teal controls (avatar, active nav). Lives in MemberTopBar so
 * it renders on mobile too — the member sidebar is desktop-only. Sets NEXT_LOCALE
 * and loads the current path in the target locale.
 *
 * Deliberately a full document navigation, not router.replace: a soft navigation
 * across the [locale] root layout on these dynamic, auth-gated pages refreshed only
 * the page segment, leaving the JA shell (sidebar, top bar, intl provider) wrapped
 * around an EN body — the toggle looked stuck.
 */
export function LangPills() {
  const locale = useLocale();
  const i18nPathname = useI18nPathname();
  const [isSwitching, setIsSwitching] = useState(false);

  const switchLocale = (newLocale: 'en' | 'ja') => {
    if (newLocale === locale || isSwitching) return;
    setIsSwitching(true);
    document.cookie = `NEXT_LOCALE=${newLocale};max-age=${60 * 60 * 24 * 30};path=/`;
    const path = getPathname({ href: i18nPathname, locale: newLocale });
    // replace, not assign: no extra history entry (matches the old router.replace),
    // so Back can't restore this page from bfcache with the pills still disabled.
    window.location.replace(`${path}${window.location.search}${window.location.hash}`);
  };

  const pillClass = (active: boolean) =>
    cn(
      'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-[var(--duration-fast)]',
      active
        ? 'bg-[color:var(--accent-teal)] text-white'
        : 'text-fg-tertiary hover:text-fg-secondary',
    );

  return (
    <div className={cn('flex items-center gap-1', isSwitching && 'opacity-50 pointer-events-none')}>
      <button type="button" onClick={() => switchLocale('en')} className={pillClass(locale === 'en')}>
        EN
      </button>
      <button type="button" onClick={() => switchLocale('ja')} className={pillClass(locale === 'ja')}>
        日本語
      </button>
    </div>
  );
}
