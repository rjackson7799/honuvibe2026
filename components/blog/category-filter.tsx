'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { BlogCategory } from '@/lib/sanity/types';

const categories: (BlogCategory | 'all')[] = [
  'all',
  'ai-tools',
  'entrepreneurship',
  'japan-us',
  'behind-the-build',
  'honuhub-stories',
  'impact',
];

export function CategoryFilter() {
  const t = useTranslations('blog');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';

  const handleCategoryClick = (category: string) => {
    if (category === 'all') {
      router.push(pathname);
    } else {
      router.push(`${pathname}?category=${category}`);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => handleCategoryClick(category)}
          className={cn(
            'shrink-0 px-4 py-2 rounded text-sm font-medium min-h-[44px]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
            activeCategory === category
              ? 'bg-accent-teal text-white'
              : 'bg-bg-tertiary text-fg-secondary border border-border-default hover:border-border-hover hover:text-fg-primary',
          )}
        >
          {t(`categories.${category}`)}
        </button>
      ))}
    </div>
  );
}
