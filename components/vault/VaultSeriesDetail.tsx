import Image from 'next/image';
import Link from 'next/link';
import { Library, Clock, Layers, Lock, Video, FileText, BookOpen, Wrench, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VaultSeriesWithItems } from '@/lib/vault/types';

const typeIcons: Record<string, typeof Video> = {
  video_custom: Video,
  video_youtube: Video,
  article: FileText,
  tool: Wrench,
  template: LayoutTemplate,
  guide: BookOpen,
  course_recording: Video,
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-accent-gold/10 text-accent-gold',
  advanced: 'bg-red-500/10 text-red-400',
};

type VaultSeriesDetailProps = {
  series: VaultSeriesWithItems;
  locale: string;
  hasAccess: boolean;
};

export function VaultSeriesDetail({ series, locale, hasAccess }: VaultSeriesDetailProps) {
  const title = locale === 'ja' && series.title_jp ? series.title_jp : series.title_en;
  const description =
    locale === 'ja' && series.description_jp ? series.description_jp : series.description_en;

  return (
    <div className="max-w-[1100px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail */}
        <div className="relative w-full md:w-80 shrink-0 aspect-video rounded-lg overflow-hidden bg-bg-tertiary">
          {series.thumbnail_url ? (
            <Image
              src={series.thumbnail_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 320px"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Library size={48} className="text-fg-tertiary" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-3">{title}</h1>
          {description && (
            <p className="text-fg-secondary leading-relaxed mb-4">{description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded bg-bg-tertiary text-fg-tertiary">
              <Layers size={14} />
              {series.item_count} items
            </span>
            {series.total_duration_minutes > 0 && (
              <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded bg-bg-tertiary text-fg-tertiary">
                <Clock size={14} />
                {series.total_duration_minutes} min total
              </span>
            )}
            {series.difficulty_level && (
              <span
                className={cn(
                  'text-sm px-3 py-1 rounded capitalize',
                  difficultyColors[series.difficulty_level],
                )}
              >
                {series.difficulty_level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Item list */}
      <div>
        <h2 className="text-lg font-serif text-fg-primary mb-4">In This Series</h2>
        {series.items.length === 0 ? (
          <p className="text-fg-tertiary py-8 text-center">No items in this series yet.</p>
        ) : (
          <div className="space-y-2">
            {series.items.map((item, idx) => {
              const itemTitle =
                locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
              const Icon = typeIcons[item.content_type] ?? FileText;
              const isPremium = item.access_tier === 'premium';
              const isLocked = isPremium && !hasAccess;

              return (
                <Link
                  key={item.id}
                  href={isLocked ? '#' : `/learn/vault/${item.slug}`}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg border transition-colors group',
                    isLocked
                      ? 'bg-bg-tertiary/50 border-border-default cursor-default opacity-60'
                      : 'bg-bg-secondary border-border-default hover:border-border-hover',
                  )}
                >
                  {/* Number */}
                  <span className="shrink-0 w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-sm font-medium text-fg-tertiary">
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative shrink-0 w-16 h-16 rounded bg-bg-tertiary overflow-hidden">
                    {item.thumbnail_url ? (
                      <Image
                        src={item.thumbnail_url}
                        alt={itemTitle}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Icon size={20} className="text-fg-tertiary" />
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Lock size={16} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        isLocked
                          ? 'text-fg-tertiary'
                          : 'text-fg-primary group-hover:text-accent-teal transition-colors',
                      )}
                    >
                      {itemTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-fg-tertiary capitalize">
                        {item.content_type.replace(/_/g, ' ')}
                      </span>
                      {item.duration_minutes && (
                        <span className="text-xs text-fg-tertiary">
                          {item.duration_minutes} min
                        </span>
                      )}
                      {isPremium && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent-gold/10 text-accent-gold">
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
