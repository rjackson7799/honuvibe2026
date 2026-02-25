'use client';

import { useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

type CategoryOption = {
  value: string;
  label: string;
};

type LibraryFilterProps = {
  categories: CategoryOption[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locale: string;
};

export function LibraryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  locale,
}: LibraryFilterProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCategoryClick = (value: string) => {
    onCategoryChange(value);
    trackEvent('library_filter', { category: value, locale });
  };

  const handleSearchChange = useCallback(
    (value: string) => {
      onSearchChange(value);

      // Debounced analytics
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          trackEvent('library_search', { search_query: value.trim(), locale });
        }
      }, 500);
    },
    [onSearchChange, locale],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={categories.length > 0 ? 'Search tutorials...' : ''}
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-lg text-base',
            'bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary',
            'focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:border-accent-teal',
            'transition-colors duration-[var(--duration-fast)]',
          )}
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Category pills */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryClick(cat.value)}
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
    </div>
  );
}
