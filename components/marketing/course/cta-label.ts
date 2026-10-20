import type { CourseCta } from '@/lib/learn/course-cta';
import { formatCoursePrice, type CourseDetailView } from '@/lib/learn/course-detail';

/** A `course_detail` translator (useTranslations or getTranslations). */
export type CourseDetailT = (key: string, values?: Record<string, string | number>) => string;

/** Hero + closing-band CTA label for a §3 row (plan D2). */
export function courseCtaLabel(
  cta: CourseCta,
  view: Pick<CourseDetailView, 'courseType' | 'priceUsd' | 'priceJpy'>,
  locale: 'en' | 'ja',
  t: CourseDetailT,
): string {
  switch (cta.kind) {
    case 'contact':
      return t(view.courseType === '1v1' ? 'cta.contact.one_on_one' : 'cta.contact.other');
    case 'buy':
      return t('cta.buy', { price: formatCoursePrice(view.priceUsd, view.priceJpy, locale) ?? '' });
    default:
      return t(`cta.${cta.kind}`);
  }
}
