'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { HvEyebrow, HvHeading, HvSection } from '@/components/marketing/hv';
import type { CourseModuleView } from '@/lib/learn/course-detail';
import { cn } from '@/lib/utils';
import { COURSE_SECTION_SCROLL_MT } from './section-anchor';

export type CurriculumOpen = 'first' | 'all' | 'none';

type CourseCurriculumProps = {
  modules: CourseModuleView[];
  /** Design flag "curriculumOpen": First module / All / None. */
  curriculumOpen?: CurriculumOpen;
  heading: string;
  sub: string | null;
  /** `course_weeks.phase` is EN-only free text: shown on EN, hidden on /ja (D13). */
  showStage: boolean;
};

function initialOpen(mode: CurriculumOpen, count: number): Set<number> {
  if (mode === 'all') return new Set(Array.from({ length: count }, (_, i) => i));
  if (mode === 'none' || count === 0) return new Set();
  return new Set([0]);
}

/**
 * Design 03 curriculum (:134-178). Unlike HvFaqAccordion this is multi-open,
 * with an Expand all / Collapse all toggle. Closed panels use `hidden`, so
 * their contents stay out of the tab order. The "+" rotation only animates
 * under motion-safe.
 */
export function CourseCurriculum({
  modules,
  curriculumOpen = 'first',
  heading,
  sub,
  showStage,
}: CourseCurriculumProps) {
  const t = useTranslations('course_detail.curriculum');
  const baseId = useId();
  const [open, setOpen] = useState<Set<number>>(() => initialOpen(curriculumOpen, modules.length));

  if (modules.length === 0) return null;

  const allOpen = open.size === modules.length;
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const toggleAll = () => setOpen(allOpen ? new Set() : initialOpen('all', modules.length));

  return (
    <HvSection id="curriculum" className={COURSE_SECTION_SCROLL_MT}>
      <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <HvEyebrow>{t('eyebrow')}</HvEyebrow>
          <HvHeading level="h2-sm" className="mt-2.5 text-hv-green-900 [word-break:auto-phrase]">
            {heading}
          </HvHeading>
          {sub && <p className="mt-2.5 text-[15.5px] text-hv-ink-500">{sub}</p>}
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="min-h-[46px] rounded-[10px] border-[1.5px] border-hv-green-900 px-[18px] text-[15px] font-semibold text-hv-green-900 transition-colors hover:bg-hv-green-900 hover:text-hv-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2"
        >
          {allOpen ? t('collapse_all') : t('expand_all')}
        </button>
      </div>

      <div className="mt-7 grid gap-3">
        {modules.map((m, i) => {
          const isOpen = open.has(i);
          const panelId = `${baseId}-module-${i}`;
          const buttonId = `${baseId}-module-button-${i}`;
          const label =
            showStage && m.stage
              ? t('module_label_stage', { n: m.number, stage: m.stage })
              : t('module_label', { n: m.number });
          const length =
            m.lessonCount === 0
              ? null
              : m.minutes != null
                ? t('lessons_length_minutes', { count: m.lessonCount, minutes: m.minutes })
                : t('lessons_length', { count: m.lessonCount });
          return (
            <div key={m.id} data-reveal className="overflow-hidden rounded-[14px] border border-hv-sand-300 bg-hv-sand-50">
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(i)}
                  className="grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 text-left text-hv-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hv-amber sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-[18px] sm:px-6"
                >
                  <span aria-hidden className="font-hv-display text-[28px] font-bold leading-none tracking-[-0.03em] text-hv-terracotta-dark sm:text-[34px]">
                    {String(m.number).padStart(2, '0')}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[12px] uppercase tracking-[0.1em] text-hv-ink-500">{label}</span>
                    <span className="hv-display font-hv-display text-[clamp(19px,2vw,24px)] font-bold leading-[1.15] tracking-[-0.02em] [word-break:auto-phrase]">
                      {m.title}
                    </span>
                    {length && <span className="text-[14px] text-hv-ink-500">{length}</span>}
                  </span>
                  <span className="flex items-center">
                    <span
                      aria-hidden
                      className={cn(
                        'text-[24px] leading-none text-hv-terracotta motion-safe:transition-transform motion-safe:duration-300',
                        isOpen && 'rotate-45',
                      )}
                    >
                      +
                    </span>
                  </span>
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                <div className="grid gap-3.5 px-5 pb-6 pt-1 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))] sm:px-6">
                  {m.lessons.map((lesson) => (
                    <div key={lesson.id} className="border-t-2 border-hv-green-900 pt-3.5">
                      <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-hv-ink-500">
                        {t('lesson_label', { code: lesson.code })}
                        {lesson.freePreview && (
                          <span className="rounded-[6px] bg-hv-amber px-2 py-0.5 text-[12px] font-semibold text-hv-green-900">
                            {t('free_preview')}
                          </span>
                        )}
                      </p>
                      <h4 className="mt-1 text-[17px] font-semibold leading-[1.3] text-hv-green-900">{lesson.title}</h4>
                      {lesson.points.length > 0 && (
                        <ul className="mt-2.5 grid list-disc gap-1.5 pl-[18px] text-[15px] leading-[1.5] text-hv-ink-700">
                          {lesson.points.map((p, j) => (
                            <li key={`${j}-${p}`}>{p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {m.task && (
                    <div className="col-span-full mt-1.5 flex flex-wrap items-baseline gap-3 rounded-[10px] bg-hv-sand-200 px-[18px] py-3.5">
                      <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-hv-terracotta-dark">
                        {t('practice_task')}
                      </span>
                      <span className="text-[16px] font-semibold text-hv-green-900">{m.task}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </HvSection>
  );
}
