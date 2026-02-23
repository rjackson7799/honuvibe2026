'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TabNavigation } from './TabNavigation';
import { WeekCard } from './WeekCard';
import { VocabularyList } from './VocabularyList';
import { Button } from '@/components/ui/button';
import type { CourseWithCurriculum, CourseWeekWithContent } from '@/lib/courses/types';

type CourseHubProps = {
  course: CourseWithCurriculum;
  locale: string;
};

type WeekState = 'current' | 'completed' | 'locked' | 'upcoming';

function getWeekState(week: CourseWeekWithContent, startDate: string | null): WeekState {
  if (!startDate) return week.is_unlocked ? 'current' : 'locked';

  const now = new Date();
  const courseStart = new Date(startDate);
  const weekStart = new Date(courseStart.getTime() + (week.week_number - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Manual unlock override
  if (week.is_unlocked && now < weekStart) return 'upcoming';
  if (!week.is_unlocked && now >= weekStart) {
    // Past the date but not unlocked — treat as locked
    return 'locked';
  }

  if (now >= weekEnd) return 'completed';
  if (now >= weekStart && now < weekEnd) return 'current';
  return 'locked';
}

function getCurrentWeek(startDate: string | null, totalWeeks: number | null): number {
  if (!startDate || !totalWeeks) return 1;
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.min(diffWeeks, totalWeeks));
}

export function CourseHub({ course, locale }: CourseHubProps) {
  const t = useTranslations('learn');
  const displayLocale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('weekly_plan');

  const title = displayLocale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const description = displayLocale === 'ja' && course.description_jp ? course.description_jp : course.description_en;

  const currentWeek = getCurrentWeek(course.start_date, course.total_weeks);
  const totalWeeks = course.total_weeks ?? 1;
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100);

  const prefix = displayLocale === 'ja' ? '/ja' : '';

  const tabs = [
    { key: 'overview', label: t('overview') },
    { key: 'weekly_plan', label: t('weekly_plan') },
    { key: 'resources', label: t('resources') },
    { key: 'community', label: t('community') },
  ];

  // Collect all resources from unlocked weeks
  const allResources = course.weeks
    .filter((w) => {
      const state = getWeekState(w, course.start_date);
      return state !== 'locked';
    })
    .flatMap((w) => w.resources);

  // Collect all vocabulary from unlocked weeks
  const allVocabulary = course.weeks
    .filter((w) => {
      const state = getWeekState(w, course.start_date);
      return state !== 'locked';
    })
    .flatMap((w) => w.vocabulary);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push(`${prefix}/learn/dashboard`)}
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        {t('back_to_dashboard')}
      </button>

      {/* Course header */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-serif text-fg-primary">{title}</h1>
        <div className="flex items-center gap-4 text-sm text-fg-tertiary">
          <span>{t('week_of', { current: currentWeek, total: totalWeeks })}</span>
          <span>{t('progress', { percent: progressPercent })}</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden max-w-md">
          <div
            className="h-full bg-accent-teal rounded-full transition-all duration-[var(--duration-slow)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {description && (
              <p className="text-fg-secondary leading-relaxed">{description}</p>
            )}

            {/* Learning outcomes */}
            {course.learning_outcomes_en && (
              <div>
                <h3 className="text-lg font-serif text-fg-primary mb-3">
                  {t('learning_outcomes')}
                </h3>
                <ul className="space-y-2">
                  {(
                    (displayLocale === 'ja' && course.learning_outcomes_jp
                      ? course.learning_outcomes_jp
                      : course.learning_outcomes_en) as string[]
                  ).map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-fg-secondary">
                      <span className="text-accent-teal mt-0.5">✓</span>
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructor */}
            {course.instructor_name && (
              <div>
                <h3 className="text-lg font-serif text-fg-primary mb-2">
                  {t('instructor')}
                </h3>
                <p className="text-sm text-fg-secondary">{course.instructor_name}</p>
              </div>
            )}

            {/* Schedule notes */}
            {course.schedule_notes_en && (
              <div>
                <h3 className="text-lg font-serif text-fg-primary mb-2">
                  {t('schedule')}
                </h3>
                <p className="text-sm text-fg-secondary">
                  {displayLocale === 'ja' && course.schedule_notes_jp
                    ? course.schedule_notes_jp
                    : course.schedule_notes_en}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Weekly Plan Tab */}
        {activeTab === 'weekly_plan' && (
          <div className="space-y-3">
            {course.weeks.map((week) => {
              const state = getWeekState(week, course.start_date);
              return (
                <WeekCard
                  key={week.id}
                  week={week}
                  state={state}
                  defaultOpen={state === 'current'}
                />
              );
            })}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {allResources.length > 0 ? (
              <div className="space-y-3">
                {allResources.map((resource) => {
                  const resourceTitle = displayLocale === 'ja' && resource.title_jp
                    ? resource.title_jp
                    : resource.title_en;
                  const resourceDesc = displayLocale === 'ja' && resource.description_jp
                    ? resource.description_jp
                    : resource.description_en;

                  return (
                    <div
                      key={resource.id}
                      className="flex items-start gap-3 p-3 border border-border-default rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-fg-primary">
                          {resource.url ? (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-accent-teal transition-colors"
                            >
                              {resourceTitle} ↗
                            </a>
                          ) : (
                            resourceTitle
                          )}
                        </h4>
                        {resourceDesc && (
                          <p className="text-xs text-fg-tertiary mt-1">{resourceDesc}</p>
                        )}
                      </div>
                      {resource.resource_type && (
                        <span className="text-xs px-2 py-0.5 bg-bg-tertiary rounded text-fg-tertiary">
                          {resource.resource_type}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-fg-tertiary text-center py-8">
                No resources available yet.
              </p>
            )}

            {/* All vocabulary */}
            {allVocabulary.length > 0 && (
              <VocabularyList vocabulary={allVocabulary} />
            )}
          </div>
        )}

        {/* Community Tab */}
        {activeTab === 'community' && (
          <div className="space-y-6 py-4">
            {course.community_platform && (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-6 text-center space-y-4">
                <h3 className="text-lg font-serif text-fg-primary">
                  {t('community')}
                </h3>
                <p className="text-sm text-fg-secondary">
                  {course.community_platform}
                  {course.community_duration_months && (
                    <> · {course.community_duration_months} months access</>
                  )}
                </p>
                {course.community_link && (
                  <Button
                    variant="primary"
                    onClick={() => window.open(course.community_link!, '_blank')}
                  >
                    Join Community ↗
                  </Button>
                )}
              </div>
            )}

            {/* Zoom link */}
            {course.zoom_link && (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-6 text-center space-y-3">
                <h3 className="text-lg font-serif text-fg-primary">
                  {t('platform')}
                </h3>
                <Button
                  variant="primary"
                  onClick={() => window.open(course.zoom_link!, '_blank')}
                >
                  {t('join_zoom')} ↗
                </Button>
              </div>
            )}

            {!course.community_platform && !course.zoom_link && (
              <p className="text-fg-tertiary text-center py-8">
                Community links will appear here after course starts.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
