'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Video, FileText, BookOpen, Wrench, LayoutTemplate, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItemForStudent } from '@/lib/dashboard/types';

type ContentFilter = 'all' | 'video' | 'walkthrough' | 'build_along' | 'guide';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

const typeIcons: Record<string, typeof Video> = {
  video_custom: Video,
  video_youtube: Video,
  article: FileText,
  tool: Wrench,
  template: LayoutTemplate,
  guide: BookOpen,
  course_recording: Video,
};

function VaultCard({ item, locale }: { item: ContentItemForStudent; locale: string }) {
  const t = useTranslations('dashboard');
  const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
  const description = locale === 'ja' && item.description_jp ? item.description_jp : item.description_en;
  const Icon = typeIcons[item.content_type] ?? FileText;

  const typeLabel = item.content_type.includes('video')
    ? t('vault_filter_video')
    : item.content_type === 'guide'
      ? t('vault_filter_guide')
      : item.content_type === 'template'
        ? t('vault_filter_build_along')
        : t('vault_filter_walkthrough');

  const difficultyLabel = item.difficulty_level === 'beginner'
    ? t('vault_difficulty_beginner')
    : item.difficulty_level === 'intermediate'
      ? t('vault_difficulty_intermediate')
      : t('vault_difficulty_advanced');

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-bg-secondary border border-border-default rounded-lg p-4 hover:border-border-hover transition-colors group"
    >
      {item.thumbnail_url && (
        <div className="aspect-video rounded-md overflow-hidden mb-3 bg-bg-tertiary">
          <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-tertiary text-fg-tertiary">
          <Icon size={12} />
          {typeLabel}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-accent-gold/10 text-accent-gold">
          {difficultyLabel}
        </span>
        {item.duration_minutes && (
          <span className="text-xs text-fg-tertiary">{item.duration_minutes} min</span>
        )}
      </div>
      <h3 className="text-sm font-medium text-fg-primary mb-1 group-hover:text-accent-teal transition-colors">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-fg-tertiary line-clamp-2">{description}</p>
      )}
    </a>
  );
}

type VaultContentGridProps = {
  items: ContentItemForStudent[];
};

export function VaultContentGrid({ items }: VaultContentGridProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');

  const contentFilters: { key: ContentFilter; label: string }[] = [
    { key: 'all', label: t('vault_filter_all') },
    { key: 'video', label: t('vault_filter_video') },
    { key: 'walkthrough', label: t('vault_filter_walkthrough') },
    { key: 'build_along', label: t('vault_filter_build_along') },
    { key: 'guide', label: t('vault_filter_guide') },
  ];

  const difficultyFilters: { key: DifficultyFilter; label: string }[] = [
    { key: 'all', label: t('vault_difficulty_all') },
    { key: 'beginner', label: t('vault_difficulty_beginner') },
    { key: 'intermediate', label: t('vault_difficulty_intermediate') },
    { key: 'advanced', label: t('vault_difficulty_advanced') },
  ];

  const filteredItems = items.filter((item) => {
    if (contentFilter !== 'all') {
      if (contentFilter === 'video' && !item.content_type.includes('video')) return false;
      if (contentFilter === 'walkthrough' && item.content_type !== 'article') return false;
      if (contentFilter === 'build_along' && item.content_type !== 'template') return false;
      if (contentFilter === 'guide' && item.content_type !== 'guide') return false;
    }
    if (difficultyFilter !== 'all' && item.difficulty_level !== difficultyFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter bars */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {contentFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setContentFilter(filter.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                contentFilter === filter.key
                  ? 'bg-accent-teal/10 text-accent-teal'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {difficultyFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setDifficultyFilter(filter.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                difficultyFilter === filter.key
                  ? 'bg-accent-gold/10 text-accent-gold'
                  : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <VaultCard key={item.id} item={item} locale={locale} />
        ))}
      </div>

      {filteredItems.length === 0 && items.length > 0 && (
        <p className="text-center text-fg-tertiary text-sm py-8">
          {t('vault_empty')}
        </p>
      )}
    </div>
  );
}
