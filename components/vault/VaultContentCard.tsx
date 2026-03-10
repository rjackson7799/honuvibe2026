'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Video, FileText, BookOpen, Wrench, LayoutTemplate, Lock, Eye, ThumbsUp, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VaultContentItem } from '@/lib/vault/types';

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

type VaultContentCardProps = {
  item: VaultContentItem;
  isCompleted?: boolean;
};

export function VaultContentCard({ item, isCompleted }: VaultContentCardProps) {
  const locale = useLocale();
  const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
  const description = locale === 'ja' && item.description_jp ? item.description_jp : item.description_en;
  const Icon = typeIcons[item.content_type] ?? FileText;
  const isPremium = item.access_tier === 'premium';

  return (
    <Link
      href={`/learn/vault/${item.slug}`}
      className="group block bg-bg-secondary border border-border-default rounded-lg overflow-hidden hover:border-border-hover transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-tertiary">
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Icon size={32} className="text-fg-tertiary" />
          </div>
        )}
        {isPremium && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-accent-gold/90 text-white text-xs font-medium">
            <Lock size={10} />
            Premium
          </div>
        )}
        {item.duration_minutes && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
            <Clock size={10} />
            {item.duration_minutes} min
          </div>
        )}
        {isCompleted && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/90 text-white text-xs font-medium">
            <CheckCircle2 size={10} />
            Done
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-tertiary text-fg-tertiary capitalize">
            <Icon size={12} />
            {item.content_type.replace(/_/g, ' ')}
          </span>
          {item.difficulty_level && (
            <span className={cn('text-xs px-2 py-0.5 rounded capitalize', difficultyColors[item.difficulty_level])}>
              {item.difficulty_level}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-fg-primary mb-1 line-clamp-2 group-hover:text-accent-teal transition-colors">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-fg-tertiary line-clamp-2 mb-3">{description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-fg-tertiary">
          <span className="inline-flex items-center gap-1">
            <Eye size={12} />
            {item.view_count.toLocaleString()}
          </span>
          {item.helpful_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <ThumbsUp size={12} />
              {item.helpful_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
