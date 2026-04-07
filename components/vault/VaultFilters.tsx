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

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localSearch, onSearchChange]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={t('search_placeholder')}
          className="vault-search-input w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
      </div>

      {/* Content type pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onContentTypeChange(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            !contentType
              ? 'bg-accent-teal/10 text-accent-teal'
              : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary',
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
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              contentType === ct.key
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary',
            )}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* Difficulty + Sort row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDifficultyChange(null)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              !difficulty
                ? 'bg-accent-gold/10 text-accent-gold'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary',
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
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                difficulty === d.key
                  ? 'bg-accent-gold/10 text-accent-gold'
                  : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary',
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
            className="px-2 py-1.5 text-xs rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
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
