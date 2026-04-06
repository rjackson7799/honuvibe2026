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
  locked?: boolean;
  onLockedClick?: () => void;
};

export function VaultContentCard({ item, isCompleted, locked, onLockedClick }: VaultContentCardProps) {
  const locale = useLocale();
  const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
  const description = locale === 'ja' && item.description_jp ? item.description_jp : item.description_en;
  const Icon = typeIcons[item.content_type] ?? FileText;

  const thumbnail = (
    <div className="relative aspect-video bg-bg-tertiary">
      {item.thumbnail_url ? (
        <Image
          src={item.thumbnail_url}
          alt={title}
          fill
          className={cn('object-cover', locked && 'blur-sm')}
          sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
        />
      ) : (
        <div className={cn('flex items-center justify-center h-full', locked && 'blur-sm')}>
          <Icon size={32} className="text-fg-tertiary" />
        </div>
      )}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm">
            <Lock size={22} className="text-white drop-shadow" />
          </div>
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
  );

  const body = (
    <div className="p-4">
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
      <h3 className="text-sm font-medium text-fg-primary mb-1 line-clamp-2 group-hover:text-accent-teal transition-colors">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-fg-tertiary line-clamp-2 mb-3">{description}</p>
      )}
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
  );

  if (locked) {
    return (
      <div
        onClick={onLockedClick}
        className="group block bg-bg-secondary border border-border-default rounded-lg overflow-hidden cursor-pointer hover:border-accent-gold/50 hover:ring-1 hover:ring-accent-gold/20 transition-colors"
      >
        {thumbnail}
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/learn/vault/${item.slug}`}
      className="group block bg-bg-secondary border border-border-default rounded-lg overflow-hidden hover:border-border-hover transition-colors"
    >
      {thumbnail}
      {body}
    </Link>
  );
}
