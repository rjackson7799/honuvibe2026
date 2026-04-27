'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Single-button locale toggle matching the design prototypes —
 * shows the *alternate* locale label, clicking switches to it.
 */
export function MarketingLangToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const alternate = locale === 'en' ? 'ja' : 'en';
  const label = alternate === 'ja' ? '日本語' : 'EN';

  const switchLocale = () => {
    document.cookie = `NEXT_LOCALE=${alternate};max-age=${60 * 60 * 24 * 30};path=/`;
    startTransition(() => {
      router.replace(pathname, { locale: alternate });
    });
  };

  return (
    <button
      type="button"
      onClick={switchLocale}
      onMouseEnter={() => router.prefetch(pathname, { locale: alternate })}
      className={cn(
        'rounded-md border border-[var(--m-border-strong)] bg-transparent',
        'px-3 py-1.5 text-[12.5px] font-semibold tracking-[0.04em]',
        'text-[var(--m-ink-secondary)]',
        'transition-colors duration-200 hover:text-[var(--m-ink-primary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]',
        isPending && 'pointer-events-none opacity-50',
      )}
      aria-label={alternate === 'ja' ? 'Switch to Japanese' : 'Switch to English'}
    >
      {label}
    </button>
  );
}
