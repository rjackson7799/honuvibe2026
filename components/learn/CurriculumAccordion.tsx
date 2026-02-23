'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseWeekWithContent } from '@/lib/courses/types';

type CurriculumAccordionProps = {
  weeks: CourseWeekWithContent[];
};

export function CurriculumAccordion({ weeks }: CurriculumAccordionProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-xl font-serif text-fg-primary mb-4">
        {t('weekly_curriculum')}
      </h2>
      <div className="space-y-2">
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
            ? `${session.duration_minutes} min`
            : null;

          return (
            <div
              key={week.id}
              className="border border-border-default rounded overflow-hidden"
            >
              {/* Header */}
              <button
                type="button"
                onClick={() =>
                  setOpenWeek(isOpen ? null : week.week_number)
                }
                className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-tertiary transition-colors duration-[var(--duration-fast)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-fg-tertiary mb-1">
                    <span>{t('week', { number: week.week_number })}</span>
                    {formatLabel && (
                      <>
                        <span>·</span>
                        <span>{formatLabel}</span>
                      </>
                    )}
                    {duration && (
                      <>
                        <span>·</span>
                        <span>{duration}</span>
                      </>
                    )}
                  </div>
                  <span className="text-fg-primary font-medium">
                    {title}
                  </span>
                </div>
                <ChevronDown
                  size={20}
                  className={cn(
                    'shrink-0 text-fg-tertiary transition-transform duration-[var(--duration-fast)]',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              {/* Content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-border-default pt-4">
                  {/* Subtitle */}
                  {subtitle && (
                    <p className="text-sm text-fg-secondary italic">
                      {subtitle}
                    </p>
                  )}

                  {/* Topics */}
                  {session?.topics_en && (
                    <div>
                      <h4 className="text-sm font-medium text-fg-primary mb-2">
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
                            <span className="text-sm font-medium text-fg-secondary">
                              {topic.title}
                            </span>
                            {topic.subtopics && (
                              <ul className="ml-4 mt-1 space-y-0.5">
                                {topic.subtopics.map((sub, j) => (
                                  <li
                                    key={j}
                                    className="text-sm text-fg-tertiary"
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

                  {/* Materials */}
                  {session?.materials_en && (
                    <div>
                      <h4 className="text-sm font-medium text-fg-primary mb-2">
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
                            className="text-sm text-fg-secondary"
                          >
                            • {material}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Assignments preview */}
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
                            className="text-sm text-fg-secondary"
                          >
                            <span className="font-medium text-accent-teal">
                              {assignTitle}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Vocabulary */}
                  {week.vocabulary.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-fg-primary mb-2">
                        {t('vocabulary')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {week.vocabulary.map((v) => (
                          <span
                            key={v.id}
                            className="text-xs px-2 py-1 bg-bg-tertiary rounded text-fg-secondary"
                          >
                            {v.term_en} / {v.term_jp}
                          </span>
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
