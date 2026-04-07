'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { TabNavigation } from './TabNavigation';
import { WeekCard } from './WeekCard';
import { VocabularyList } from './VocabularyList';
import { LearningOutcomes } from './LearningOutcomes';
import { ToolsBadges } from './ToolsBadges';
import { HowItWorks } from './HowItWorks';
import { CurriculumAccordion } from './CurriculumAccordion';
import { BonusSessionsSection } from './BonusSessionsSection';
import { EnrollButton } from './EnrollButton';
import { PriceDisplay } from './PriceDisplay';
import { InstructorCard } from './InstructorCard';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layout/container';
import { ESLTab } from '@/components/esl/ESLTab';
import { getFreeSessionIds } from '@/lib/courses/utils';
import type { CourseWithCurriculum, CourseWeekWithContent } from '@/lib/courses/types';

type CourseHubProps = {
  course: CourseWithCurriculum;
  locale: string;
  isEnrolled: boolean;
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

export function CourseHub({ course, locale, isEnrolled }: CourseHubProps) {
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

  // Preview mode for non-enrolled users
  if (!isEnrolled) {
    const freeSessionIds = getFreeSessionIds(course.free_preview_count, course.weeks);
    const outcomes = displayLocale === 'ja' && course.learning_outcomes_jp?.length
      ? course.learning_outcomes_jp
      : course.learning_outcomes_en;
    const isFull = course.max_enrollment !== null && course.current_enrollment >= course.max_enrollment;

    return (
      <div className="space-y-10">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.push(`${prefix}/learn/dashboard/courses`)}
          className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
        >
          <ArrowLeft size={16} />
          {t('back_to_my_courses')}
        </button>

        {/* Course header + top CTA */}
        <div className="space-y-5">
          {/* Meta strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-widest text-accent-teal">
            {course.level && <span>{course.level}</span>}
            {course.total_weeks && <><span className="text-border-primary opacity-40">·</span><span>{t('weeks', { count: course.total_weeks })}</span></>}
            {course.language && <><span className="text-border-primary opacity-40">·</span><span>{course.language === 'both' ? 'EN/JP' : course.language.toUpperCase()}</span></>}
          </div>

          <h1 className="text-2xl md:text-3xl font-serif text-fg-primary">{title}</h1>

          {description && (
            <p className="text-fg-secondary leading-relaxed max-w-2xl">{description}</p>
          )}

          {/* Top CTA strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-bg-secondary border border-border-primary rounded-xl">
            <div className="space-y-1">
              <PriceDisplay priceUsd={course.price_usd} priceJpy={course.price_jpy} size="lg" />
              <div className="flex flex-wrap gap-3 text-xs text-fg-tertiary">
                {course.live_sessions_count != null && <span>{t('live_sessions', { count: course.live_sessions_count })}</span>}
                {course.recorded_lessons_count != null && <><span>·</span><span>{t('recorded_lessons', { count: course.recorded_lessons_count })}</span></>}
                {course.max_enrollment != null && <><span>·</span><span>{t('cohort_size')}: {course.max_enrollment}</span></>}
              </div>
            </div>
            <EnrollButton
              courseId={course.id}
              courseSlug={course.slug}
              isLoggedIn={true}
              isEnrolled={false}
              isFull={isFull}
              priceUsd={course.price_usd}
              priceJpy={course.price_jpy}
              size="lg"
            />
          </div>
        </div>

        <LearningOutcomes outcomes={outcomes} />
        <ToolsBadges tools={course.tools_covered} />
        <HowItWorks communityMonths={course.community_duration_months} />
        <CurriculumAccordion
          weeks={course.weeks}
          isEnrolled={false}
          isLoggedIn={true}
          freeSessionIds={Array.from(freeSessionIds)}
        />
        {course.bonusSessions.length > 0 && (
          <BonusSessionsSection sessions={course.bonusSessions} isEnrolled={false} />
        )}
        <InstructorCard
          instructor={course.instructor ?? null}
          fallbackName={course.instructor_name}
          locale={displayLocale}
        />

        {/* Enroll CTA */}
        <div className="rounded-xl bg-bg-secondary border border-border-primary p-8 text-center space-y-4">
          <h2 className="font-serif text-xl text-fg-primary">{t('ready_to_enroll')}</h2>
          <PriceDisplay priceUsd={course.price_usd} priceJpy={course.price_jpy} size="lg" />
          <EnrollButton
            courseId={course.id}
            courseSlug={course.slug}
            isLoggedIn={true}
            isEnrolled={false}
            isFull={isFull}
            priceUsd={course.price_usd}
            priceJpy={course.price_jpy}
          />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: t('overview') },
    { key: 'weekly_plan', label: t('weekly_plan') },
    ...(course.esl_enabled
      ? [{ key: 'esl', label: t('esl_practice') }]
      : []),
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

  const imageUrl = course.hero_image_url || course.thumbnail_url;

  return (
    <div>
      {/* Hero image banner — negative margin to negate dashboard layout padding */}
      <div className="relative overflow-hidden -mt-6 -mx-6 md:-mt-8 md:-mx-8">
        {imageUrl ? (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src={imageUrl}
                alt=""
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </div>
            {/* Gradient overlays for text readability */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[var(--bg-primary)]/95 via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/60" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]/40" />
          </>
        ) : (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="glow-orb"
              style={{
                width: '400px',
                height: '400px',
                top: '-10%',
                right: '-5%',
                background: 'var(--glow-teal)',
                opacity: 0.15,
              }}
            />
            <div
              className="glow-orb"
              style={{
                width: '300px',
                height: '300px',
                bottom: '5%',
                left: '-5%',
                background: 'var(--glow-gold)',
                opacity: 0.1,
                animationDelay: '-4s',
              }}
            />
          </div>
        )}

        <Container className="relative z-10">
          <div className="px-6 md:px-8 py-6 md:py-8 space-y-3">
            {/* Back link */}
            <button
              type="button"
              onClick={() => router.push(`${prefix}/learn/dashboard`)}
              className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
            >
              <ArrowLeft size={16} />
              {t('back_to_dashboard')}
            </button>

            {/* Course title */}
            <h1 className="text-2xl md:text-3xl font-serif text-fg-primary">{title}</h1>

            {/* Progress info */}
            <div className="flex items-center gap-4 text-sm text-fg-tertiary">
              <span>{t('week_of', { current: currentWeek, total: totalWeeks })}</span>
              <span>{t('progress', { percent: progressPercent })}</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-bg-tertiary/50 rounded-full overflow-hidden max-w-md">
              <div
                className="h-full bg-accent-teal rounded-full transition-all duration-[var(--duration-slow)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Container>
      </div>

      {/* Tabs and content */}
      <Container className="space-y-6 mt-6">
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
        {activeTab === 'esl' && course.esl_enabled && (
          <div className="py-4">
            <ESLTab
              courseId={course.id}
              weeks={course.weeks}
              eslIncluded={course.esl_included}
              eslPriceUsd={course.esl_price_usd}
              eslPriceJpy={course.esl_price_jpy}
            />
          </div>
        )}

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
      </Container>
    </div>
  );
}
