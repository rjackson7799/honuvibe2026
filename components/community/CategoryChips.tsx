'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CATEGORIES, type Category } from '@/lib/community/constants';

const LABEL_KEYS: Record<Category | 'all', string> = {
  all: 'category_all',
  general: 'category_general',
  show_and_tell: 'category_show_and_tell',
  help: 'category_help',
  wins: 'category_wins',
  announcements: 'category_announcements',
};

export function CategoryChips() {
  const t = useTranslations('community');
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('category') ?? 'all';

  const setCategory = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    if (next === 'all') sp.delete('category');
    else sp.set('category', next);
    sp.delete('cursor');
    router.push(`?${sp.toString()}`, { scroll: false });
  };

  const items: ReadonlyArray<Category | 'all'> = ['all', ...CATEGORIES];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((cat) => {
        const active = current === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={
              active
                ? 'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold bg-[color:var(--accent-teal)] text-white'
                : 'px-3.5 py-1.5 rounded-full text-[12.5px] font-medium bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-colors'
            }
          >
            {t(LABEL_KEYS[cat])}
          </button>
        );
      })}
    </div>
  );
}
