'use client';

import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { VaultContentType, VaultDifficulty, VaultSortOption } from '@/lib/vault/types';

type VaultFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  contentType: VaultContentType | null;
  onContentTypeChange: (value: VaultContentType | null) => void;
  difficulty: VaultDifficulty | null;
  onDifficultyChange: (value: VaultDifficulty | null) => void;
  sort: VaultSortOption;
  onSortChange: (value: VaultSortOption) => void;
};

export function VaultFilters({
  search,
  onSearchChange,
  contentType,
  onContentTypeChange,
  difficulty,
  onDifficultyChange,
  sort,
  onSortChange,
}: VaultFiltersProps) {
  const t = useTranslations('vault');
  const [localSearch, setLocalSearch] = useState(search);

  const contentTypes: { key: VaultContentType; label: string }[] = [
    { key: 'video_youtube', label: t('type_video') },
    { key: 'article', label: t('type_article') },
    { key: 'guide', label: t('type_guide') },
    { key: 'template', label: t('type_template') },
    { key: 'tool', label: t('type_tool') },
    { key: 'course_recording', label: t('type_recording') },
  ];

  const difficulties: { key: VaultDifficulty; label: string }[] = [
    { key: 'beginner', label: t('level_beginner') },
    { key: 'intermediate', label: t('level_intermediate') },
    { key: 'advanced', label: t('level_advanced') },
  ];

  const sortOptions: { key: VaultSortOption; label: string }[] = [
    { key: 'newest', label: t('sort_newest') },
    { key: 'oldest', label: t('sort_oldest') },
    { key: 'popular', label: t('sort_popular') },
    { key: 'helpful', label: t('sort_helpful') },
  ];
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    debounceRef.current = setTimeout(() => {
      onSearchChangeRef.current(localSearch);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localSearch]);

  // Active chip styles per difficulty (teal=beginner, coral=intermediate, purple=advanced)
  const levelActive: Record<VaultDifficulty, string> = {
    beginner: 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]',
    intermediate: 'bg-[color:var(--accent-coral)] text-white border-[color:var(--accent-coral)]',
    advanced: 'bg-[color:var(--accent-purple)] text-white border-[color:var(--accent-purple)]',
  };

  const chipBase = 'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap';
  const chipInactive =
    'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-tertiary" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={t('search_placeholder')}
          className="vault-search-input w-full pl-11 pr-10 py-3 text-sm rounded-[10px] bg-bg-secondary border-[1.5px] border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-[color:var(--accent-teal)] transition-colors"
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => setLocalSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Content type chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onContentTypeChange(null)}
          className={cn(
            chipBase,
            !contentType
              ? 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]'
              : chipInactive,
          )}
        >
          {t('filter_type')}
        </button>
        {contentTypes.map((ct) => (
          <button
            key={ct.key}
            type="button"
            onClick={() => onContentTypeChange(contentType === ct.key ? null : ct.key)}
            className={cn(
              chipBase,
              contentType === ct.key
                ? 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]'
                : chipInactive,
            )}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* Difficulty + Sort row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="hidden sm:inline-block w-px h-5 bg-border-default mx-1" aria-hidden />
          <button
            type="button"
            onClick={() => onDifficultyChange(null)}
            className={cn(
              chipBase,
              !difficulty
                ? 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]'
                : chipInactive,
            )}
          >
            {t('filter_level')}
          </button>
          {difficulties.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => onDifficultyChange(difficulty === d.key ? null : d.key)}
              className={cn(
                chipBase,
                difficulty === d.key ? levelActive[d.key] : chipInactive,
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal size={14} className="text-fg-tertiary" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as VaultSortOption)}
            className="px-3 py-2 text-[13px] rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary font-medium focus:outline-none focus:border-[color:var(--accent-teal)] cursor-pointer hover:border-border-hover transition-colors"
          >
            {sortOptions.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
