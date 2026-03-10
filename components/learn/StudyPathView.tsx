'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, RefreshCw, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PathItemCard } from './PathItemCard';
import { ContentViewer } from './ContentViewer';
import { PremiumUpgradeCard } from './PremiumUpgradeCard';
import type { StudyPathWithItems, StudyPathItem } from '@/lib/paths/types';

type StudyPathViewProps = {
  path: StudyPathWithItems;
  hasPremium: boolean;
};

export function StudyPathView({ path: initialPath, hasPremium }: StudyPathViewProps) {
  const t = useTranslations('study_paths');
  const tDash = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();

  const [path, setPath] = useState(initialPath);
  const [activeItem, setActiveItem] = useState<StudyPathItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  const prefix = locale === 'ja' ? '/ja' : '';
  const title = locale === 'ja' && path.title_jp ? path.title_jp : path.title_en;

  const sortedItems = useMemo(
    () => [...path.items].sort((a, b) => a.sort_order - b.sort_order),
    [path.items],
  );

  const completedCount = sortedItems.filter((i) => i.is_completed).length;
  const totalCount = sortedItems.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find the first uncompleted item
  const nextItem = sortedItems.find((i) => !i.is_completed);

  function getItemStatus(item: StudyPathItem): 'completed' | 'next' | 'upcoming' | 'locked' {
    if (item.is_completed) return 'completed';
    if (item.item_access_tier === 'premium' && !hasPremium) return 'locked';
    if (nextItem && item.id === nextItem.id) return 'next';
    return 'upcoming';
  }

  async function handleMarkComplete(itemId: string) {
    const response = await fetch(
      `/api/learn/paths/${path.id}/items/${itemId}`,
      { method: 'PUT' },
    );

    if (!response.ok) {
      console.error('Failed to update item');
      return;
    }

    const data = await response.json();

    // Update local state
    setPath((prev) => ({
      ...prev,
      status: data.pathCompleted ? 'completed' : prev.status,
      completed_at: data.pathCompleted ? new Date().toISOString() : prev.completed_at,
      items: prev.items.map((i) =>
        i.id === itemId ? data.item : i,
      ),
    }));

    setActiveItem(null);
  }

  function handleStartItem(item: StudyPathItem) {
    setActiveItem(item);
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await fetch(`/api/learn/paths/${path.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      router.push(`${prefix}/learn/dashboard`);
    } catch {
      console.error('Failed to archive path');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href={`${prefix}/learn/dashboard`}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tDash('nav_dashboard')}
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl text-fg-primary">{title}</h1>
        <div className="mt-1 text-sm text-fg-muted">
          {totalCount} {t('resources')} · ~{path.estimated_hours ?? 0}h
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
            <span>{t('path_progress', { completed: completedCount, total: totalCount })}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-teal transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active content viewer */}
      {activeItem && (
        <div className="space-y-2">
          <ContentViewer
            url={activeItem.item_embed_url || activeItem.item_url || `/learn/vault/${activeItem.content_item_id}`}
            contentType={activeItem.item_content_type}
            title={activeItem.item_title_en ?? ''}
          />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkComplete(activeItem.id)}
            >
              {t('mark_complete')}
            </Button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {/* Completed items */}
        {sortedItems.filter((i) => i.is_completed).length > 0 && (
          <div className="space-y-2">
            {sortedItems
              .filter((i) => i.is_completed)
              .map((item, i) => (
                <PathItemCard
                  key={item.id}
                  item={item}
                  index={sortedItems.indexOf(item)}
                  status="completed"
                  onMarkComplete={handleMarkComplete}
                />
              ))}
          </div>
        )}

        {/* Next up separator */}
        {nextItem && completedCount > 0 && (
          <div className="flex items-center gap-2 py-2">
            <div className="h-px flex-1 bg-accent-teal/30" />
            <span className="text-xs font-medium text-accent-teal uppercase tracking-wider">
              {t('next_up')}
            </span>
            <div className="h-px flex-1 bg-accent-teal/30" />
          </div>
        )}

        {/* Uncompleted items */}
        {sortedItems
          .filter((i) => !i.is_completed)
          .map((item, i) => {
            const status = getItemStatus(item);

            // Add "coming up" separator after next item
            const showComingUp = i === 1 && status !== 'locked';

            return (
              <div key={item.id}>
                {showComingUp && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="h-px flex-1 bg-border-primary" />
                    <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                      {t('coming_up')}
                    </span>
                    <div className="h-px flex-1 bg-border-primary" />
                  </div>
                )}
                <PathItemCard
                  item={item}
                  index={sortedItems.indexOf(item)}
                  status={status}
                  onMarkComplete={handleMarkComplete}
                  onStart={status !== 'locked' ? handleStartItem : undefined}
                />
              </div>
            );
          })}
      </div>

      {/* Premium upgrade for locked items */}
      {!hasPremium &&
        sortedItems.some((i) => i.item_access_tier === 'premium') && (
          <PremiumUpgradeCard variant="inline" />
        )}

      {/* Path actions */}
      <div className="flex flex-col gap-3 sm:flex-row border-t border-border-primary pt-6">
        <Button
          variant="ghost"
          size="sm"
          href={`${prefix}/learn/paths/${path.id}/regenerate`}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            router.push(`${prefix}/learn/paths/new?regenerate=${path.id}`);
          }}
        >
          <RefreshCw className="h-4 w-4" />
          {t('regenerate')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleArchive}
          disabled={archiving}
        >
          <Archive className="h-4 w-4" />
          {t('archive_path')}
        </Button>
      </div>

      {/* Cohort upsell */}
      <div className="rounded-lg border border-border-primary bg-bg-secondary p-4 text-center">
        <p className="text-sm font-medium text-fg-primary">
          {t('cohort_upsell_title')}
        </p>
        <p className="text-xs text-fg-secondary mt-1">
          {t('cohort_upsell_text')}
        </p>
        <Link
          href={`${prefix}/learn`}
          className="inline-block mt-3 text-sm text-accent-teal hover:underline"
        >
          {t('view_courses')}
        </Link>
      </div>
    </div>
  );
}
