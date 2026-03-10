'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Library, Clock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VaultSeries } from '@/lib/vault/types';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-accent-gold/10 text-accent-gold',
  advanced: 'bg-red-500/10 text-red-400',
};

type VaultSeriesCardProps = {
  series: VaultSeries;
};

export function VaultSeriesCard({ series }: VaultSeriesCardProps) {
  const locale = useLocale();
  const title = locale === 'ja' && series.title_jp ? series.title_jp : series.title_en;
  const description =
    locale === 'ja' && series.description_jp ? series.description_jp : series.description_en;

  return (
    <Link
      href={`/learn/vault/series/${series.slug}`}
      className="group block bg-bg-secondary border border-border-default rounded-lg overflow-hidden hover:border-border-hover transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-tertiary">
        {series.thumbnail_url ? (
          <Image
            src={series.thumbnail_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Library size={32} className="text-fg-tertiary" />
          </div>
        )}
        {series.is_featured && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-accent-gold/90 text-white text-xs font-medium">
            Featured
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-tertiary text-fg-tertiary">
            <Layers size={12} />
            {series.item_count} items
          </span>
          {series.total_duration_minutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-tertiary text-fg-tertiary">
              <Clock size={12} />
              {series.total_duration_minutes} min
            </span>
          )}
          {series.difficulty_level && (
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded capitalize',
                difficultyColors[series.difficulty_level],
              )}
            >
              {series.difficulty_level}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-fg-primary mb-1 line-clamp-2 group-hover:text-accent-teal transition-colors">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-fg-tertiary line-clamp-2">{description}</p>
        )}
      </div>
    </Link>
  );
}
