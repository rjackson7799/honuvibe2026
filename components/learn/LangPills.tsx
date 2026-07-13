'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter as useI18nRouter, usePathname as useI18nPathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * EN / 日本語 locale switcher for the member area, styled as filled-teal pills to
 * match the top bar's teal controls (avatar, active nav). Lives in MemberTopBar so
 * it renders on mobile too — the member sidebar is desktop-only. Sets NEXT_LOCALE
 * and replaces the current path in the target locale.
 */
export function LangPills() {
  const locale = useLocale();
  const i18nPathname = useI18nPathname();
  const i18nRouter = useI18nRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: 'en' | 'ja') => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale};max-age=${60 * 60 * 24 * 30};path=/`;
    startTransition(() => {
      i18nRouter.replace(i18nPathname, { locale: newLocale });
    });
  };

  const pillClass = (active: boolean) =>
    cn(
      'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-[var(--duration-fast)]',
      active
        ? 'bg-[color:var(--accent-teal)] text-white'
        : 'text-fg-tertiary hover:text-fg-secondary',
    );

  return (
    <div className={cn('flex items-center gap-1', isPending && 'opacity-50 pointer-events-none')}>
      <button type="button" onClick={() => switchLocale('en')} className={pillClass(locale === 'en')}>
        EN
      </button>
      <button type="button" onClick={() => switchLocale('ja')} className={pillClass(locale === 'ja')}>
        日本語
      </button>
    </div>
  );
}
