'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { ESLLessonView } from './ESLLessonView';
import { ESLPurchaseCard } from './ESLPurchaseCard';
import type { CourseWeekWithContent } from '@/lib/courses/types';
import type { ESLLessonWithAudio, ESLProgress } from '@/lib/esl/types';

type ESLTabProps = {
  courseId: string;
  weeks: CourseWeekWithContent[];
  eslIncluded: boolean;
  eslPriceUsd: number | null;
  eslPriceJpy: number | null;
};

export function ESLTab({
  courseId,
  weeks,
  eslIncluded,
  eslPriceUsd,
  eslPriceJpy,
}: ESLTabProps) {
  const t = useTranslations('esl');
  const locale = useLocale();
  const [selectedWeekId, setSelectedWeekId] = useState<string>(weeks[0]?.id ?? '');
  const [lesson, setLesson] = useState<ESLLessonWithAudio | null>(null);
  const [progress, setProgress] = useState<ESLProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!selectedWeekId) return;

    setLoading(true);
    setAccessDenied(false);

    fetch(`/api/esl/${selectedWeekId}`)
      .then(async (res) => {
        if (res.status === 403) {
          setAccessDenied(true);
          setLesson(null);
          return;
        }
        if (!res.ok) {
          setLesson(null);
          return;
        }
        const json = await res.json();
        setLesson(json.data ?? null);
      })
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));
  }, [selectedWeekId]);

  // Fetch progress separately (doesn't block UI)
  useEffect(() => {
    if (!lesson) return;

    fetch('/api/esl/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eslLessonId: lesson.id }),
    }).catch(() => {});
    // Progress is loaded within ESLLessonView from initial props
  }, [lesson]);

  return (
    <div className="space-y-6">
      {/* Week selector */}
      {weeks.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weeks.map((week) => {
            const weekTitle =
              locale === 'ja' && week.title_jp ? week.title_jp : week.title_en;
            const isSelected = week.id === selectedWeekId;
            return (
              <button
                key={week.id}
                type="button"
                onClick={() => setSelectedWeekId(week.id)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent-teal)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] border border-[var(--border-primary)]'
                }`}
              >
                W{week.week_number}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--fg-muted)]" />
        </div>
      )}

      {!loading && accessDenied && (
        <ESLPurchaseCard
          courseId={courseId}
          priceUsd={eslPriceUsd}
          priceJpy={eslPriceJpy}
        />
      )}

      {!loading && !accessDenied && lesson && (
        <ESLLessonView
          lesson={lesson}
          progress={progress}
          eslLessonId={lesson.id}
        />
      )}

      {!loading && !accessDenied && !lesson && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--fg-muted)]">
            {t('no_esl_content')}
          </p>
        </div>
      )}
    </div>
  );
}
