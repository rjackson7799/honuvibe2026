'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';

type LangToggleProps = {
  compact?: boolean;
};

export function LangToggle({ compact = false }: LangToggleProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const alternateLocale = locale === 'en' ? 'ja' : 'en';

  const switchLocale = (newLocale: 'en' | 'ja') => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale};max-age=${60 * 60 * 24 * 30};path=/`;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  const prefetchAlternate = () => {
    router.prefetch(pathname, { locale: alternateLocale });
  };

  // Compact mode: Globe icon that cycles to the alternate locale
  if (compact) {
    return (
      <div className={cn(isPending && 'opacity-50 pointer-events-none')}>
        <IconButton
          icon={Globe}
          label={alternateLocale === 'ja' ? '日本語に切替' : 'Switch to EN'}
          onClick={() => switchLocale(alternateLocale)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm whitespace-nowrap shrink-0 transition-opacity duration-[var(--duration-fast)]',
        isPending && 'opacity-50 pointer-events-none',
      )}
    >
      <button
        onClick={() => switchLocale('en')}
        onMouseEnter={locale !== 'en' ? prefetchAlternate : undefined}
        onFocus={locale !== 'en' ? prefetchAlternate : undefined}
        className={cn(
          'rounded px-2 py-1 transition-colors duration-[var(--duration-fast)]',
          'min-h-[44px] min-w-[44px] flex items-center justify-center',
          locale === 'en'
            ? 'text-accent-teal font-semibold'
            : 'text-fg-tertiary hover:text-fg-secondary',
        )}
      >
        EN
      </button>
      <span className="text-fg-muted">|</span>
      <button
        onClick={() => switchLocale('ja')}
        onMouseEnter={locale !== 'ja' ? prefetchAlternate : undefined}
        onFocus={locale !== 'ja' ? prefetchAlternate : undefined}
        className={cn(
          'rounded px-2 py-1 transition-colors duration-[var(--duration-fast)]',
          'min-h-[44px] min-w-[44px] flex items-center justify-center',
          locale === 'ja'
            ? 'text-accent-teal font-semibold'
            : 'text-fg-tertiary hover:text-fg-secondary',
        )}
      >
        日本語
      </button>
    </div>
  );
}
