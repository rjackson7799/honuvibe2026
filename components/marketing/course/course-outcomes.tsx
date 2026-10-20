import { useTranslations } from 'next-intl';
import { HvEyebrow, HvHeading, HvSection } from '@/components/marketing/hv';
import { COURSE_SECTION_SCROLL_MT } from './section-anchor';

/** Design 03 "What you'll be able to do" (:121-132): numbered outcome grid. */
export function CourseOutcomes({ outcomes }: { outcomes: string[] }) {
  const t = useTranslations('course_detail.outcomes');
  if (outcomes.length === 0) return null;

  return (
    <HvSection id="outcomes" className={COURSE_SECTION_SCROLL_MT}>
      <div data-reveal>
        <HvEyebrow>{t('eyebrow')}</HvEyebrow>
        <HvHeading level="h2-sm" className="mt-2.5 text-hv-green-900 [word-break:auto-phrase]">
          {t('title')}
        </HvHeading>
      </div>
      <ol
        data-reveal
        className="mt-7 grid gap-px overflow-hidden rounded-[14px] border border-hv-sand-300 bg-hv-sand-300 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]"
      >
        {outcomes.map((o, i) => (
          <li key={`${i}-${o}`} className="flex flex-col gap-2.5 bg-hv-sand-100 px-6 py-[22px]">
            <span aria-hidden className="font-hv-display text-[15px] font-bold text-hv-terracotta-dark">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-[16.5px] leading-[1.5] text-hv-ink">{o}</span>
          </li>
        ))}
      </ol>
    </HvSection>
  );
}
