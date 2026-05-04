'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';
import type { CourseWeekWithContent } from '@/lib/courses/types';

type CurriculumAccordionProps = {
  weeks: CourseWeekWithContent[];
  freeSessionIds?: string[];
  isLoggedIn?: boolean;
  isEnrolled?: boolean;
};

export function CurriculumAccordion({ weeks, freeSessionIds = [], isEnrolled = false }: CurriculumAccordionProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  return (
    <div>
      <SectionHeading size="h2" className="mb-6">
        {t('weekly_curriculum')}
      </SectionHeading>
      <div className="space-y-3">
        {weeks.map((week) => {
          const isOpen = openWeek === week.week_number;
          const title =
            locale === 'ja' && week.title_jp
              ? week.title_jp
              : week.title_en;
          const subtitle =
            locale === 'ja' && week.subtitle_jp
              ? week.subtitle_jp
              : week.subtitle_en;

          const session = week.sessions[0];
          const formatLabel = session
            ? t(`format_${session.format}`)
            : null;
          const duration = session?.duration_minutes
            ? t('duration_minutes', { count: session.duration_minutes })
            : null;
          const hasFreeSession = week.sessions.some(
            (s) => freeSessionIds.includes(s.id),
          );

          return (
            <div
              key={week.id}
              className="bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-md)] overflow-hidden shadow-[var(--m-shadow-xs)]"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenWeek(isOpen ? null : week.week_number)
                }
                className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--m-canvas)] transition-colors duration-150"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
                      {t('week', { number: week.week_number })}
                    </span>
                    {formatLabel && (
                      <BadgePill variant="gray" size="xs">
                        {formatLabel}
                      </BadgePill>
                    )}
                    {duration && (
                      <span className="text-[12px] text-[var(--m-ink-tertiary)]">
                        · {duration}
                      </span>
                    )}
                    {hasFreeSession && !isEnrolled && (
                      <BadgePill variant="teal" size="xs">
                        {t('freemium.freePreview')}
                      </BadgePill>
                    )}
                  </div>
                  <span className="text-[var(--m-ink-primary)] font-bold text-[16px] tracking-[-0.01em]">
                    {title}
                  </span>
                </div>
                <ChevronDown
                  size={20}
                  className={cn(
                    'shrink-0 text-[var(--m-ink-tertiary)] transition-transform duration-150',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-[var(--m-border-soft)] pt-4">
                  {subtitle && (
                    <p className="text-sm text-[var(--m-ink-secondary)] italic">
                      {subtitle}
                    </p>
                  )}

                  {(session?.topics_en || session?.topics_jp) && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--m-ink-primary)] mb-2">
                        {t('topics_covered')}
                      </h4>
                      <ul className="space-y-2">
                        {(
                          (locale === 'ja' && session.topics_jp
                            ? session.topics_jp
                            : session.topics_en) as {
                            title: string;
                            subtopics?: string[];
                          }[]
                        ).map((topic, i) => (
                          <li key={i}>
                            <span className="text-sm font-medium text-[var(--m-ink-secondary)]">
                              {topic.title}
                            </span>
                            {topic.subtopics && (
                              <ul className="ml-4 mt-1 space-y-0.5">
                                {topic.subtopics.map((sub, j) => (
                                  <li
                                    key={j}
                                    className="text-sm text-[var(--m-ink-tertiary)]"
                                  >
                                    • {sub}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(session?.materials_en || session?.materials_jp) && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--m-ink-primary)] mb-2">
                        {t('session_materials')}
                      </h4>
                      <ul className="space-y-1">
                        {(
                          (locale === 'ja' && session.materials_jp
                            ? session.materials_jp
                            : session.materials_en) as string[]
                        ).map((material, i) => (
                          <li
                            key={i}
                            className="text-sm text-[var(--m-ink-secondary)]"
                          >
                            • {material}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {week.assignments.length > 0 && (
                    <div>
                      {week.assignments.map((assignment) => {
                        const assignTitle =
                          locale === 'ja' && assignment.title_jp
                            ? assignment.title_jp
                            : assignment.title_en;
                        return (
                          <div
                            key={assignment.id}
                            className="text-sm"
                          >
                            <span className="font-semibold text-[var(--m-accent-teal)]">
                              {assignTitle}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {week.vocabulary.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--m-ink-primary)] mb-2">
                        {t('vocabulary')}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {week.vocabulary.map((v) => (
                          <BadgePill key={v.id} variant="gray" size="xs">
                            {v.term_en} / {v.term_jp}
                          </BadgePill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
