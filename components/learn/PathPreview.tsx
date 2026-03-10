'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PathItemCard } from './PathItemCard';
import type { StudyPathWithItems } from '@/lib/paths/types';

type PathPreviewProps = {
  path: StudyPathWithItems;
  onStartLearning: () => void;
  onRegenerate: (feedback: string) => void;
  isRegenerating: boolean;
};

export function PathPreview({
  path,
  onStartLearning,
  onRegenerate,
  isRegenerating,
}: PathPreviewProps) {
  const t = useTranslations('study_paths');
  const locale = useLocale();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');

  const title = locale === 'ja' && path.title_jp ? path.title_jp : path.title_en;
  const description =
    locale === 'ja' && path.description_jp
      ? path.description_jp
      : path.description_en;

  function handleRegenerate() {
    if (!showFeedback) {
      setShowFeedback(true);
      return;
    }
    onRegenerate(feedback);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="font-display text-2xl text-fg-primary">
          {t('preview_title')}
        </h2>
        <h3 className="font-display text-lg text-accent-teal">{title}</h3>
        <p className="text-sm text-fg-secondary max-w-lg mx-auto">
          {description}
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-fg-muted">
          <span>
            {t('preview_stats', {
              count: path.total_items ?? path.items.length,
              hours: path.estimated_hours ?? 0,
            })}
          </span>
          <span>·</span>
          <span>{t('preview_free_items', { count: path.free_items ?? 0 })}</span>
          {(path.premium_items ?? 0) > 0 && (
            <>
              <span>+</span>
              <span>
                {t('preview_premium_items', { count: path.premium_items ?? 0 })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {path.items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item, i) => (
            <PathItemCard
              key={item.id}
              item={item}
              index={i}
              status={i === 0 ? 'next' : 'upcoming'}
            />
          ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          variant="primary"
          size="lg"
          onClick={onStartLearning}
        >
          {t('start_learning')}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          {t('regenerate')}
        </Button>
      </div>

      {/* Feedback input for regeneration */}
      {showFeedback && (
        <div className="space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('regenerate_feedback')}
            rows={2}
            className="w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-fg-primary placeholder:text-fg-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onRegenerate(feedback)}
              disabled={isRegenerating}
            >
              {t('regenerate')}
            </Button>
          </div>
        </div>
      )}

      {/* Premium note */}
      {(path.premium_items ?? 0) > 0 && (
        <p className="text-center text-xs text-fg-muted">
          {t('premium_items_note', { count: path.premium_items ?? 0 })}
        </p>
      )}
    </div>
  );
}
