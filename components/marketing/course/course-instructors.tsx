import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { HvEyebrow, HvHeading, HvSection } from '@/components/marketing/hv';
import type { CourseLanguage } from '@/lib/courses/types';
import type { CourseInstructorView } from '@/lib/learn/course-detail';
import { COURSE_SECTION_SCROLL_MT } from './section-anchor';

type CourseInstructorsProps = { instructors: CourseInstructorView[]; language: CourseLanguage };

/** Design 03 instructors (:180-201), without the design's tags (no data). H2 by course language (D11). */
export function CourseInstructors({ instructors, language }: CourseInstructorsProps) {
  const t = useTranslations('course_detail.instructors');
  if (instructors.length === 0) return null;

  const title =
    language === 'both' ? t('title_both') : instructors.length > 1 ? t('title_many') : t('title_one');

  return (
    <HvSection id="instructors" className={COURSE_SECTION_SCROLL_MT}>
      <div data-reveal>
        <HvEyebrow>{t('eyebrow')}</HvEyebrow>
        <HvHeading level="h2-sm" className="mt-2.5 text-hv-green-900 [word-break:auto-phrase]">
          {title}
        </HvHeading>
      </div>
      <div className="mt-7 grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
        {instructors.map((ins, i) => {
          const meta = [ins.role ? t(`role.${ins.role}`) : null, ins.title].filter(Boolean).join(' · ');
          return (
            <article
              key={`${i}-${ins.name}`}
              data-reveal
              className="grid items-start gap-5 rounded-[16px] border border-hv-sand-300 bg-hv-sand-50 p-[26px] sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-[22px]"
            >
              <div className="relative h-[104px] w-[104px] overflow-hidden rounded-full bg-hv-sand-300">
                {ins.photoUrl && <Image src={ins.photoUrl} alt="" fill sizes="104px" className="object-cover" />}
              </div>
              <div>
                <h3 className="font-hv-display text-[23px] font-bold tracking-[-0.02em] text-hv-green-900">{ins.name}</h3>
                {meta && <p className="mt-1 text-[14.5px] font-semibold text-hv-terracotta-dark">{meta}</p>}
                {ins.bio && <p className="mt-3 text-[15.5px] leading-[1.6] text-hv-ink-700">{ins.bio}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </HvSection>
  );
}
