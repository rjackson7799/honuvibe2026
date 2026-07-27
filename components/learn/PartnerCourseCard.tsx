import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { PartnerCatalogItem } from '@/lib/partners/catalog';

type PartnerCourseCardProps = {
  item: PartnerCatalogItem;
  locale: string;
  labels: {
    continue: string;
    review: string;
    view: string;
    open: string;
  };
};

/**
 * One card in the partner rail.
 *
 * Presentation is fully determined by the enrollment union — `unknown` (the
 * dashboard bundle failed) must never render the not-enrolled CTA, or a paying
 * member gets offered a course they already own.
 *
 * Links to /learn/dashboard/<slug>, which handles the not-enrolled case itself
 * (CourseHub isEnrolled), so a member is never bounced to the public sales page.
 */
export function PartnerCourseCard({ item, locale, labels }: PartnerCourseCardProps) {
  const { course, enrollment } = item;
  const prefix = locale === 'ja' ? '/ja' : '';
  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const description =
    locale === 'ja' && course.description_jp ? course.description_jp : course.description_en;

  const cta =
    enrollment.state === 'active'
      ? labels.continue
      : enrollment.state === 'completed'
        ? labels.review
        : enrollment.state === 'not_enrolled'
          ? labels.view
          : labels.open;

  const showProgress = enrollment.state === 'active' || enrollment.state === 'completed';

  return (
    <Link
      href={`${prefix}/learn/dashboard/${course.slug}`}
      className="group flex min-h-[44px] flex-col rounded-[12px] border border-border-default bg-bg-secondary p-4 transition-colors hover:border-[color:var(--accent-teal)]"
    >
      <span className="text-[13.5px] font-semibold text-fg-primary line-clamp-2">{title}</span>

      {description && (
        <span className="mt-1.5 text-[12.5px] leading-[1.7] text-fg-secondary line-clamp-2">
          {description}
        </span>
      )}

      {showProgress && (
        <span className="mt-3 block">
          <ProgressBar percent={enrollment.progressPercent} label={title} />
        </span>
      )}

      <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--accent-teal)]">
        {cta}
        <ArrowRight size={13} aria-hidden="true" />
      </span>
    </Link>
  );
}
