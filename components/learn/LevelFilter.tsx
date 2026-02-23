'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const levels = ['all', 'beginner', 'intermediate', 'advanced'] as const;

export function LevelFilter() {
  const t = useTranslations('learn');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLevel = searchParams.get('level') || 'all';

  const handleClick = (level: string) => {
    if (level === 'all') {
      router.push(pathname);
    } else {
      router.push(`${pathname}?level=${level}`);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap">
      {levels.map((level) => (
        <button
          key={level}
          onClick={() => handleClick(level)}
          className={cn(
            'shrink-0 px-4 py-2 rounded text-sm font-medium min-h-[44px]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
            activeLevel === level
              ? 'bg-accent-teal text-white'
              : 'bg-bg-tertiary text-fg-secondary border border-border-default hover:border-border-hover hover:text-fg-primary',
          )}
        >
          {level === 'all' ? t('all_levels') : t(level)}
        </button>
      ))}
    </div>
  );
}
