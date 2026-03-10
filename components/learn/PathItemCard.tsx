'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Video,
  FileText,
  Wrench,
  BookOpen,
  Download,
  Check,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudyPathItem } from '@/lib/paths/types';

type ItemStatus = 'completed' | 'next' | 'upcoming' | 'locked';

type PathItemCardProps = {
  item: StudyPathItem;
  index: number;
  status: ItemStatus;
  onMarkComplete?: (itemId: string) => Promise<void>;
  onStart?: (item: StudyPathItem) => void;
};

const TYPE_ICONS: Record<string, typeof Video> = {
  video_youtube: Video,
  video_custom: Video,
  article: FileText,
  tool: Wrench,
  guide: BookOpen,
  template: Download,
  course_recording: Video,
};

function getContentTypeIcon(type: string | null) {
  return TYPE_ICONS[type ?? ''] ?? FileText;
}

export function PathItemCard({
  item,
  index,
  status,
  onMarkComplete,
  onStart,
}: PathItemCardProps) {
  const t = useTranslations('study_paths');
  const locale = useLocale();
  const [completing, setCompleting] = useState(false);

  const Icon = getContentTypeIcon(item.item_content_type);
  const title = item.item_title_en ?? `Item ${index + 1}`;
  const rationale =
    locale === 'ja' ? item.rationale_jp : item.rationale_en;
  const learningFocus =
    locale === 'ja' ? item.learning_focus_jp : item.learning_focus_en;

  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const isNext = status === 'next';

  async function handleComplete() {
    if (!onMarkComplete || completing) return;
    setCompleting(true);
    try {
      await onMarkComplete(item.id);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-[var(--duration-normal)] ${
        isCompleted
          ? 'border-accent-teal/30 bg-accent-teal/5'
          : isNext
            ? 'border-accent-teal bg-bg-secondary shadow-sm'
            : isLocked
              ? 'border-border-primary bg-bg-secondary opacity-70'
              : 'border-border-primary bg-bg-secondary'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {isCompleted ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-teal text-white">
              <Check className="h-3.5 w-3.5" />
            </div>
          ) : isLocked ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border-primary text-fg-muted">
              <Lock className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border-primary text-fg-muted text-xs font-medium">
              {index + 1}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 flex-shrink-0 text-fg-muted" />
            <h4 className={`text-sm font-medium truncate ${isCompleted ? 'text-fg-secondary line-through' : 'text-fg-primary'}`}>
              {title}
            </h4>
          </div>

          {/* Meta row */}
          <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
            {item.item_duration_minutes && (
              <span>{item.item_duration_minutes} min</span>
            )}
            {item.item_access_tier === 'premium' && (
              <span className="rounded bg-accent-gold/20 px-1.5 py-0.5 text-accent-gold text-[10px] font-medium uppercase">
                Premium
              </span>
            )}
            {item.item_content_type && (
              <span className="capitalize">
                {item.item_content_type.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Rationale — expanded for "next up" items */}
          {isNext && rationale && (
            <p className="mt-2 text-xs text-fg-secondary leading-relaxed">
              {rationale}
            </p>
          )}

          {/* Learning focus — shown for "next up" */}
          {isNext && learningFocus && (
            <p className="mt-1.5 text-xs text-accent-teal italic">
              {learningFocus}
            </p>
          )}

          {/* Actions */}
          {(isNext || isCompleted) && !isLocked && (
            <div className="mt-3 flex items-center gap-2">
              {isNext && onStart && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onStart(item)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('start')}
                </Button>
              )}
              {onMarkComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleComplete}
                  disabled={completing}
                >
                  <Check className="h-3.5 w-3.5" />
                  {isCompleted ? t('completed') : t('mark_complete')}
                </Button>
              )}
            </div>
          )}

          {/* Premium lock */}
          {isLocked && (
            <p className="mt-2 text-xs text-accent-gold">
              {t('upgrade_to_access')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
