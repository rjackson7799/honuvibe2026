'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import type { StudyPathWithProgress } from '@/lib/paths/types';

type PathCardProps = {
  path: StudyPathWithProgress;
};

export function PathCard({ path }: PathCardProps) {
  const t = useTranslations('study_paths');
  const locale = useLocale();

  const title =
    locale === 'ja' && path.title_jp ? path.title_jp : path.title_en;

  const totalItems = path.total_items ?? 0;
  const completedItems = path.completed_items ?? 0;
  const isCompleted = path.status === 'completed';
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const prefix = locale === 'ja' ? '/ja' : '';

  return (
    <Link
      href={`${prefix}/learn/paths/${path.id}`}
      className="block rounded-lg border border-border-primary bg-bg-secondary p-4 transition-all duration-[var(--duration-normal)] hover:border-border-hover hover:shadow-sm"
    >
      <h3 className="font-display text-base text-fg-primary truncate">
        {title ?? t('untitled_path')}
      </h3>

      <div className="mt-1 text-xs text-fg-muted">
        {totalItems} {t('resources')} · ~{path.estimated_hours ?? 0}h
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-teal transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-fg-muted">
          {isCompleted
            ? t('completed')
            : t('path_progress', { completed: completedItems, total: totalItems })}
        </span>
        <span className="flex items-center gap-1 text-xs text-accent-teal font-medium">
          {isCompleted ? t('view') : t('continue')}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
