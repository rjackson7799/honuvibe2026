'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { RefreshCw, Check, AlertCircle, Loader2, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ESLReviewPanel } from './ESLReviewPanel';

type ESLLesson = {
  id: string;
  week_id: string;
  status: string;
  generation_error: string | null;
  updated_at: string;
};

type Week = {
  id: string;
  week_number: number;
  title_en: string;
  title_jp: string | null;
};

type Course = {
  id: string;
  title_en: string;
  title_jp: string | null;
  esl_enabled: boolean;
  esl_included: boolean;
  esl_settings_json: unknown;
};

type ESLAdminDashboardProps = {
  course: Course;
  weeks: Week[];
  eslLessons: ESLLesson[];
  locale: string;
};

const statusConfig: Record<string, { icon: typeof Check; color: string; label: string }> = {
  published: { icon: Check, color: 'text-emerald-400', label: 'Published' },
  review: { icon: Clock, color: 'text-amber-400', label: 'In Review' },
  generating: { icon: Loader2, color: 'text-blue-400', label: 'Generating' },
  failed: { icon: AlertCircle, color: 'text-rose-400', label: 'Failed' },
};

export function ESLAdminDashboard({
  course,
  weeks,
  eslLessons: initialLessons,
  locale,
}: ESLAdminDashboardProps) {
  const t = useTranslations('esl');
  const displayLocale = useLocale();
  const [eslLessons, setEslLessons] = useState(initialLessons);
  const [generating, setGenerating] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [reviewLessonId, setReviewLessonId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generatingLessons = eslLessons.filter((l) => l.status === 'generating');

  const pollStatus = useCallback(async () => {
    const ids = eslLessons
      .filter((l) => l.status === 'generating')
      .map((l) => l.id);
    if (ids.length === 0) return;

    try {
      const res = await fetch(`/api/esl/status?lessonIds=${ids.join(',')}`);
      if (!res.ok) return;
      const data = await res.json();
      const updated = data.lessons as ESLLesson[];
      if (!updated || updated.length === 0) return;

      setEslLessons((prev) =>
        prev.map((lesson) => {
          const match = updated.find((u) => u.id === lesson.id);
          if (match && match.status !== lesson.status) {
            return { ...lesson, status: match.status, generation_error: match.generation_error };
          }
          return lesson;
        }),
      );
    } catch {
      // Silently ignore polling errors
    }
  }, [eslLessons]);

  useEffect(() => {
    if (generatingLessons.length > 0) {
      pollRef.current = setInterval(pollStatus, 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [generatingLessons.length, pollStatus]);

  const getLessonForWeek = (weekId: string) =>
    eslLessons.find((l) => l.week_id === weekId);

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/esl/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state with new generating lessons
        const newLessons = data.eslLessonIds.map((item: { weekId: string; eslLessonId: string }) => ({
          id: item.eslLessonId,
          week_id: item.weekId,
          status: 'generating',
          generation_error: null,
          updated_at: new Date().toISOString(),
        }));
        setEslLessons((prev) => {
          const existing = prev.filter(
            (l) => !newLessons.some((n: ESLLesson) => n.week_id === l.week_id),
          );
          return [...existing, ...newLessons];
        });
      }
    } catch (err) {
      console.error('Generate failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateWeek = async (weekId: string) => {
    try {
      const res = await fetch('/api/esl/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, weekIds: [weekId] }),
      });
      if (res.ok) {
        const data = await res.json();
        const newLesson = data.eslLessonIds[0];
        if (newLesson) {
          setEslLessons((prev) => {
            const filtered = prev.filter((l) => l.week_id !== weekId);
            return [
              ...filtered,
              {
                id: newLesson.eslLessonId,
                week_id: weekId,
                status: 'generating',
                generation_error: null,
                updated_at: new Date().toISOString(),
              },
            ];
          });
        }
      }
    } catch (err) {
      console.error('Generate failed:', err);
    }
  };

  const handlePublish = async (weekId: string) => {
    try {
      const res = await fetch(`/api/esl/${weekId}/publish`, {
        method: 'POST',
      });
      if (res.ok) {
        setEslLessons((prev) =>
          prev.map((l) =>
            l.week_id === weekId ? { ...l, status: 'published' } : l,
          ),
        );
      }
    } catch (err) {
      console.error('Publish failed:', err);
    }
  };

  const handleGenerateAudio = async (eslLessonId: string) => {
    try {
      await fetch('/api/esl/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eslLessonId }),
      });
    } catch (err) {
      console.error('Audio generation failed:', err);
    }
  };

  const courseTitle =
    displayLocale === 'ja' && course.title_jp ? course.title_jp : course.title_en;

  if (reviewLessonId) {
    return (
      <ESLReviewPanel
        eslLessonId={reviewLessonId}
        onBack={() => setReviewLessonId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--fg-primary)]">
            {t('esl_dashboard_title')}
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1">{courseTitle}</p>
        </div>
        <Button
          onClick={handleGenerateAll}
          disabled={generating}
          variant="primary"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin mr-1.5" />
          ) : (
            <Play size={14} className="mr-1.5" />
          )}
          {t('generate_all')}
        </Button>
      </div>

      {/* Weeks table */}
      <div className="rounded-xl border border-[var(--border-primary)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
              <th className="text-left text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider px-4 py-3">
                Week
              </th>
              <th className="text-left text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wider px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => {
              const lesson = getLessonForWeek(week.id);
              const status = lesson?.status ?? 'not_started';
              const config = statusConfig[status];
              const weekTitle =
                displayLocale === 'ja' && week.title_jp
                  ? week.title_jp
                  : week.title_en;

              return (
                <tr
                  key={week.id}
                  className="border-b border-[var(--border-primary)] last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[var(--fg-primary)]">
                      W{week.week_number}: {weekTitle}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {config ? (
                      <span className={`flex items-center gap-1.5 text-xs ${config.color}`}>
                        <config.icon
                          size={14}
                          className={status === 'generating' ? 'animate-spin' : ''}
                        />
                        {config.label}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--fg-muted)]">Not started</span>
                    )}
                    {lesson?.generation_error && (
                      <p className="text-xs text-rose-400 mt-1 truncate max-w-xs">
                        {lesson.generation_error}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {(!lesson || status === 'failed') && (
                        <button
                          type="button"
                          onClick={() => handleGenerateWeek(week.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
                        >
                          {t('generate')}
                        </button>
                      )}
                      {status === 'review' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setReviewLessonId(lesson!.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
                          >
                            {t('edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateAudio(lesson!.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400"
                          >
                            Audio
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePublish(week.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"
                          >
                            {t('publish')}
                          </button>
                        </>
                      )}
                      {status === 'published' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setReviewLessonId(lesson!.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
                          >
                            {t('edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateWeek(week.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400"
                          >
                            <RefreshCw size={12} className="inline mr-1" />
                            {t('regenerate')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
