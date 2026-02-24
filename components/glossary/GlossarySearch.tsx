'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import type { GlossaryTermSummary, GlossaryCategory } from '@/lib/sanity/types';

type CategoryOption = {
  value: 'all' | GlossaryCategory;
  label: string;
};

type GlossarySearchProps = {
  terms: GlossaryTermSummary[];
  locale: string;
  onFilteredTermsChange: (filtered: GlossaryTermSummary[]) => void;
  categories: CategoryOption[];
  searchPlaceholder: string;
  emptyState: string;
};

export function GlossarySearch({
  terms,
  locale,
  onFilteredTermsChange,
  categories,
  searchPlaceholder,
}: GlossarySearchProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filter = useCallback(
    (q: string, cat: string) => {
      const lower = q.toLowerCase().trim();
      return terms.filter((term) => {
        const matchesCategory = cat === 'all' || term.category === cat;
        if (!matchesCategory) return false;
        if (!lower) return true;
        return (
          term.term_en.toLowerCase().includes(lower) ||
          (term.term_jp?.toLowerCase().includes(lower) ?? false) ||
          (term.abbreviation?.toLowerCase().includes(lower) ?? false) ||
          (term.reading_jp?.toLowerCase().includes(lower) ?? false) ||
          term.definition_short_en.toLowerCase().includes(lower) ||
          (term.definition_short_jp?.toLowerCase().includes(lower) ?? false)
        );
      });
    },
    [terms],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const filtered = filter(query, activeCategory);
      onFilteredTermsChange(filtered);
      if (query.trim()) {
        trackEvent('glossary_search', {
          search_query: query.trim(),
          results_count: String(filtered.length),
          locale,
        });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query, activeCategory, filter, onFilteredTermsChange, locale]);

  const handleCategoryChange = (value: string) => {
    setActiveCategory(value);
    trackEvent('glossary_filter', { category: value, locale });
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className={cn(
          'w-full md:max-w-sm',
          'h-11 px-4 rounded border border-border-default bg-bg-secondary',
          'text-base text-fg-primary placeholder:text-fg-tertiary',
          'focus:outline-none focus:border-accent-teal',
          'transition-colors duration-[var(--duration-fast)]',
        )}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap md:pb-0">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[44px]',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
              activeCategory === cat.value
                ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal'
                : 'bg-bg-tertiary text-fg-secondary border border-border-default hover:border-border-hover hover:text-fg-primary',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
