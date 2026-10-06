'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Locale = 'en' | 'ja';

const OPTIONS: ReadonlyArray<{ locale: Locale; label: string }> = [
  { locale: 'en', label: 'EN' },
  { locale: 'ja', label: '日本語' },
];

type LangToggleProps = {
  /** dark = on the green header (green-950 track); light = on sand (Sign In right panel). */
  tone?: 'dark' | 'light';
  /** Accessible name for the group ("Language"). */
  label: string;
  className?: string;
};

/**
 * README "Language toggle (EN / 日本語)": two-segment pill, each button at
 * least 36×44px, active segment inverted. Switching keeps the query string
 * and hash so /signin?redirect=… and in-page anchors survive the hop.
 */
export function HvLangToggle({ tone = 'dark', label, className }: LangToggleProps) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dark = tone === 'dark';

  function select(next: Locale) {
    if (next === locale || isPending) return;
    document.cookie = `NEXT_LOCALE=${next};max-age=${60 * 60 * 24 * 30};path=/`;
    startTransition(() => {
      router.replace(`${pathname}${window.location.search}${window.location.hash}`, {
        locale: next,
        scroll: false,
      });
    });
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border p-[3px]',
        dark ? 'border-hv-green-700 bg-hv-green-950' : 'border-hv-sand-300 bg-hv-sand-50',
        isPending && 'opacity-60',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = option.locale === locale;
        return (
          <button
            key={option.locale}
            type="button"
            lang={option.locale}
            aria-pressed={active}
            disabled={isPending}
            onClick={() => select(option.locale)}
            onMouseEnter={active ? undefined : () => router.prefetch(pathname, { locale: option.locale })}
            onFocus={active ? undefined : () => router.prefetch(pathname, { locale: option.locale })}
            className={cn(
              // 36px visual height (README); the ::before extends the hit area to 44px.
              "relative min-h-[36px] min-w-[44px] rounded-full px-3 text-[13.5px] font-semibold before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
              'transition-colors duration-200 ease-hv',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber',
              active
                ? dark
                  ? 'bg-hv-sand-100 text-hv-green-900'
                  : 'bg-hv-green-900 text-hv-sand-100'
                : dark
                  ? 'text-hv-green-200 hover:text-hv-sand-100'
                  : 'text-hv-ink-700 hover:text-hv-green-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
