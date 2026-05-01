'use client';

import { useState } from 'react';
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

const typeLabels: Record<string, string> = {
  video_custom: 'Video',
  video_youtube: 'Video',
  article: 'Article',
  tool: 'Tool',
  template: 'Template',
  guide: 'Guide',
  course_recording: 'Recording',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]',
  intermediate: 'bg-[color:var(--accent-coral-subtle)] text-[color:var(--accent-coral)]',
  advanced: 'bg-[color:var(--accent-purple-subtle)] text-[color:var(--accent-purple)]',
};

// Deterministic gradient thumbnail per item (stable across renders)
const thumbGradients = [
  'linear-gradient(135deg, #ddeedd 0%, #c8dcc8 100%)',
  'linear-gradient(135deg, #dde8e8 0%, #c4d4d4 100%)',
  'linear-gradient(135deg, #e8dde4 0%, #d4c4cc 100%)',
  'linear-gradient(135deg, #ede8dc 0%, #d8cdb8 100%)',
  'linear-gradient(135deg, #dde0ee 0%, #c4c8d8 100%)',
  'linear-gradient(135deg, #e0ede0 0%, #c8d8c8 100%)',
  'linear-gradient(135deg, #f0e0d4 0%, #ddc8b4 100%)',
  'linear-gradient(135deg, #d8e4ee 0%, #c0ccdc 100%)',
];

function gradientFor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return thumbGradients[Math.abs(hash) % thumbGradients.length];
}

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
  const [imgError, setImgError] = useState(false);

  const thumbnail = (
    <div
      className="relative h-[120px] overflow-hidden"
      style={!item.thumbnail_url || imgError ? { background: gradientFor(item.slug) } : undefined}
    >
      {item.thumbnail_url && !imgError ? (
        <Image
          src={item.thumbnail_url}
          alt={title}
          fill
          className={cn('object-cover', locked && 'blur-[2px]')}
          sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={cn('flex items-center justify-center h-full', locked && 'blur-[2px]')}>
          <Icon size={32} strokeWidth={1.2} className="text-[rgba(26,43,51,0.25)]" />
        </div>
      )}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(15,169,160,0)] group-hover:bg-[rgba(15,169,160,0.15)] transition-colors">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[rgba(26,43,51,0.7)] backdrop-blur-sm">
            <Lock size={20} className="text-white" />
          </div>
        </div>
      )}
      {item.duration_minutes && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgba(26,43,51,0.7)] backdrop-blur-sm text-white text-[11px] font-semibold">
          <Clock size={10} />
          {item.duration_minutes} min
        </div>
      )}
      {isCompleted && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-[color:var(--accent-teal)] text-white text-[10.5px] font-bold uppercase tracking-[0.04em]">
          <CheckCircle2 size={10} />
          Done
        </div>
      )}
    </div>
  );

  const typeLabel = typeLabels[item.content_type] ?? item.content_type.replace(/_/g, ' ');

  const body = (
    <div className="p-3.5 flex flex-col gap-2 flex-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[rgba(26,43,51,0.06)] text-fg-secondary">
          <Icon size={11} />
          {typeLabel}
        </span>
        {item.difficulty_level && (
          <span
            className={cn(
              'text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize',
              difficultyColors[item.difficulty_level],
            )}
          >
            {item.difficulty_level}
          </span>
        )}
      </div>
      <h3 className="text-[13.5px] font-bold text-fg-primary leading-[1.4] tracking-[-0.01em] line-clamp-2">
        {title}
      </h3>
      {description && (
        <p className="text-[12px] text-fg-tertiary leading-[1.55] line-clamp-2 flex-1">{description}</p>
      )}
      <div className="flex items-center gap-3 text-[11.5px] text-fg-tertiary">
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

  const cardClass = cn(
    'group relative flex flex-col bg-bg-secondary border border-border-default rounded-[14px] overflow-hidden',
    'shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 hover:border-[color:var(--accent-teal)]/35',
    'transition-all duration-200 cursor-pointer',
  );

  if (locked) {
    return (
      <div onClick={onLockedClick} className={cardClass}>
        {thumbnail}
        {body}
      </div>
    );
  }

  return (
    <Link href={`/learn/vault/${item.slug}`} className={cardClass}>
      {thumbnail}
      {body}
    </Link>
  );
}
