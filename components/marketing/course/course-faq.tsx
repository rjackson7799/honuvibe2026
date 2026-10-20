import { useLocale, useTranslations } from 'next-intl';
import {
  HvEyebrow,
  HvFaqAccordion,
  HvHeading,
  HvSection,
  HvTestimonialCarousel,
  type FaqItem,
  type Testimonial,
} from '@/components/marketing/hv';
import type { CourseCta } from '@/lib/learn/course-cta';
import { formatCourseDate, formatCoursePrice, type CourseDetailView } from '@/lib/learn/course-detail';
import type { CourseDetailT } from './cta-label';
import { COURSE_SECTION_SCROLL_MT } from './section-anchor';

type CourseFaqProps = { view: CourseDetailView; cta: Pick<CourseCta, 'kind' | 'priceCard'>; quotes: Testimonial[] };

/**
 * D4: course-agnostic FAQ templates; each item is dropped when its data is
 * missing. "How do I get access?" is also dropped while enrollment is closed
 * or full, so it never offers a price the CTA can't sell.
 */
export function buildCourseFaqItems(
  view: CourseDetailView,
  cta: Pick<CourseCta, 'kind' | 'priceCard'>,
  t: CourseDetailT,
  locale: 'en' | 'ja',
): FaqItem[] {
  const items: FaqItem[] = [];
  const k = 'faq.items';

  const starts = view.facts.find((f) => f.key === 'starts');
  const live =
    view.formatKind === 'one_on_one'
      ? t(`${k}.live.a_one_on_one`)
      : view.formatKind === 'self_paced'
        ? t(`${k}.live.a_self_paced`)
        : starts
          ? t(`${k}.live.a_live_dated`, { date: formatCourseDate(starts.date, locale) })
          : t(`${k}.live.a_live`);
  items.push({ q: t(`${k}.live.q`), a: live });

  if (view.totalWeeks) {
    const paced = view.modules.length === view.totalWeeks;
    items.push({
      q: t(`${k}.length.q`),
      a: t(paced ? `${k}.length.a_paced` : `${k}.length.a`, { n: view.totalWeeks }),
    });
  }

  items.push({ q: t(`${k}.language.q`), a: t(`${k}.language.a_${view.language}`) });

  let access: string | null = null;
  switch (cta.kind === 'closed' || cta.kind === 'full' ? null : cta.priceCard) {
    case 'vault_join':
    case 'vault_member':
      access = t(`${k}.access.a_vault`);
      break;
    case 'course_price': {
      const price = formatCoursePrice(view.priceUsd, view.priceJpy, locale);
      access = price ? t(`${k}.access.a_price`, { price }) : null;
      break;
    }
    case 'free':
      access = t(`${k}.access.a_free`);
      break;
    case 'contact':
      access = t(view.courseType === '1v1' ? `${k}.access.a_contact_one_on_one` : `${k}.access.a_contact_other`);
      break;
    case 'enrolled':
      access = null;
      break;
  }
  if (access) items.push({ q: t(`${k}.access.q`), a: access });

  if (view.cancellationPolicy) {
    items.push({ q: t(`${k}.cancellation.q`), a: view.cancellationPolicy });
  }

  return items;
}

/** Design 03 "About this course" (:225-261): testimonial carousel beside the FAQ, first item open. */
export function CourseFaq({ view, cta, quotes }: CourseFaqProps) {
  const t = useTranslations('course_detail');
  const locale = useLocale() === 'ja' ? 'ja' : 'en';
  const items = buildCourseFaqItems(view, cta, t, locale);

  return (
    <HvSection id="faq" className={COURSE_SECTION_SCROLL_MT}>
      <div className="grid items-start gap-9 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
        <div data-reveal>
          <HvEyebrow>{t('faq.eyebrow')}</HvEyebrow>
          <HvHeading level="h2" className="mt-2.5 max-w-[16ch] text-hv-green-900 [word-break:auto-phrase]">
            {t('faq.title')}
          </HvHeading>
          {quotes.length > 0 && (
            <HvTestimonialCarousel quotes={quotes} tone="light" className="mt-9 max-w-[480px]" />
          )}
        </div>
        <HvFaqAccordion items={items} defaultOpen={0} />
      </div>
    </HvSection>
  );
}
