import { useTranslations } from 'next-intl';
import { HvEyebrow, HvHeading, HvSection } from '@/components/marketing/hv';
import type { CourseDetailView } from '@/lib/learn/course-detail';
import { COURSE_SECTION_SCROLL_MT } from './section-anchor';

/** Design 03 "Who it's for" (:93-119): audience list + Before you start + Tools. Hidden when all three are empty. */
export function CourseOverview({ view }: { view: Pick<CourseDetailView, 'audience' | 'prerequisites' | 'tools'> }) {
  const t = useTranslations('course_detail.overview');
  const { audience, prerequisites, tools } = view;
  if (audience.length === 0 && !prerequisites && tools.length === 0) return null;

  return (
    <HvSection id="overview" className={COURSE_SECTION_SCROLL_MT}>
      <div className="grid items-start gap-11 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        {audience.length > 0 && (
          <div data-reveal>
            <HvEyebrow>{t('eyebrow')}</HvEyebrow>
            <HvHeading level="h2-sm" className="mt-2.5 text-hv-green-900 [word-break:auto-phrase]">
              {t('title')}
            </HvHeading>
            <ul className="mt-6 grid gap-3.5">
              {audience.map((a) => (
                <li key={a} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3 text-[16.5px] leading-[1.55] text-hv-ink">
                  <span aria-hidden className="font-bold text-hv-terracotta">
                    →
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(prerequisites || tools.length > 0) && (
          <div data-reveal className="grid gap-[18px]">
            {prerequisites && (
              <div className="rounded-[14px] border border-hv-sand-300 bg-hv-sand-50 p-6">
                <p className="text-[12px] uppercase tracking-[0.1em] text-hv-ink-500">{t('before')}</p>
                <p className="mt-3 text-[16px] leading-[1.6] text-hv-ink">{prerequisites}</p>
              </div>
            )}
            {tools.length > 0 && (
              <div className="rounded-[14px] border border-hv-sand-300 bg-hv-sand-50 p-6">
                <p className="text-[12px] uppercase tracking-[0.1em] text-hv-ink-500">{t('tools')}</p>
                <ul className="mt-3.5 flex flex-wrap gap-2">
                  {tools.map((tool) => (
                    <li
                      key={tool}
                      className="inline-flex min-h-10 items-center rounded-full border-[1.5px] border-hv-green-900 px-4 text-[15px] font-semibold text-hv-green-900"
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </HvSection>
  );
}
