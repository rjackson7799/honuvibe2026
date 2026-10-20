import { useTranslations } from 'next-intl';
import { HvSection } from '@/components/marketing/hv';
import { COURSE_SECTION_SCROLL_MT } from './section-anchor';

type CourseSyllabusProps = { courseId: string; locales: ('en' | 'ja')[] };

/**
 * Design 03 syllabus band (:203-223). Rows hit the on-demand syllabus API
 * (generates and caches the PDF per locale) as plain <a> — an /api/ route,
 * never prefixed with /ja. EN always; JA when the course is not EN-only (D6).
 */
export function CourseSyllabus({ courseId, locales }: CourseSyllabusProps) {
  const t = useTranslations('course_detail.syllabus');
  if (locales.length === 0) return null;

  return (
    <HvSection id="syllabus" className={COURSE_SECTION_SCROLL_MT}>
      <div
        data-reveal
        className="grid items-center gap-8 rounded-[16px] bg-hv-green-900 p-[clamp(24px,3.4vw,44px)] text-hv-sand-100 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]"
      >
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-hv-amber">{t('eyebrow')}</p>
          <h2 className="hv-display mt-2.5 font-hv-display text-[clamp(26px,3vw,36px)] font-bold leading-[1.08] tracking-[-0.03em] [word-break:auto-phrase]">
            {t('title')}
          </h2>
          <p className="mt-3 max-w-[46ch] text-[15.5px] leading-[1.6] text-hv-green-200">{t('body')}</p>
        </div>
        <div className="grid gap-3">
          {locales.map((loc) => (
            <a
              key={loc}
              href={`/api/courses/${courseId}/syllabus?locale=${loc}`}
              className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 rounded-[12px] border-[1.5px] border-hv-green-700 bg-hv-green-800 px-5 py-4 text-hv-sand-100 transition-colors hover:border-hv-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
            >
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-hv-sand-100 text-[12px] font-bold tracking-[0.04em] text-hv-green-900">
                PDF
              </span>
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="text-[16px] font-semibold">{loc === 'ja' ? t('row_ja') : t('row_en')}</span>
                <span className="text-[13.5px] text-hv-green-400">{t('meta')}</span>
              </span>
              <span aria-hidden className="text-[20px] text-hv-amber">
                ↓
              </span>
            </a>
          ))}
        </div>
      </div>
    </HvSection>
  );
}
