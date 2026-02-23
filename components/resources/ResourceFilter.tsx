'use client';

import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

type CategoryOption = {
  value: string;
  label: string;
};

type ResourceFilterProps = {
  categories: CategoryOption[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  locale: string;
};

export function ResourceFilter({ categories, activeCategory, onCategoryChange, locale }: ResourceFilterProps) {
  const handleClick = (value: string) => {
    onCategoryChange(value);
    trackEvent('resource_filter', { category: value, locale });
  };

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
    >
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => handleClick(cat.value)}
          className={cn(
            'shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[44px]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
            activeCategory === cat.value
              ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal'
              : 'bg-bg-tertiary text-fg-secondary border border-border-default hover:border-border-hover hover:text-fg-primary',
          )}
          style={{ scrollSnapAlign: 'start' }}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
