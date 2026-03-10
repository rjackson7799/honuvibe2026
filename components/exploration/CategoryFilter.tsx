'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const categories = ['all', 'web', 'database', 'saas', 'automations', 'pro-bono'] as const;

type Props = {
  active: string;
  onChange: (category: string) => void;
};

export function CategoryFilter({ active, onChange }: Props) {
  const t = useTranslations('exploration_page.filter');

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => {
            onChange(cat);
            if (cat !== 'all') {
              trackEvent('explore_filter_change', { territory: cat });
            }
          }}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors duration-[var(--duration-fast)]',
            'border min-h-[44px]',
            active === cat
              ? 'bg-accent-teal text-white border-accent-teal'
              : 'bg-transparent text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary',
          )}
        >
          {t(cat)}
        </button>
      ))}
    </div>
  );
}
