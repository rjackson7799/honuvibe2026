'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function LangToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: 'en' | 'ja') => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale};max-age=${60 * 60 * 24 * 30};path=/`;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => switchLocale('en')}
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
