import Image from 'next/image';
import type { InstructorCardData } from '@/lib/instructors/types';

type CourseCheckoutSummaryProps = {
  title: string;
  description: string | null;
  overlineParts: string[];
  thumbnailUrl: string | null;
  priceFormatted: string;
  secondaryPriceFormatted: string | null;
  startDateFormatted: string | null;
  spotsRemaining: number | null;
  learningOutcomes: string[];
  instructor: InstructorCardData | null | undefined;
  locale: string;
  courseSlug: string;
};

export function CourseCheckoutSummary({
  title,
  description,
  overlineParts,
  thumbnailUrl,
  priceFormatted,
  secondaryPriceFormatted,
  startDateFormatted,
  spotsRemaining,
  learningOutcomes,
  instructor,
  locale,
  courseSlug,
}: CourseCheckoutSummaryProps) {
  const prefix = locale === 'ja' ? '/ja' : '';

  const scarcityColor =
    spotsRemaining !== null && spotsRemaining <= 2
      ? 'text-red-400'
      : spotsRemaining !== null && spotsRemaining <= 5
        ? 'text-amber-400'
        : 'text-fg-secondary';

  const outcomesToShow = learningOutcomes.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <a
        href={`${prefix}/learn/dashboard/courses`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-tertiary hover:text-accent-teal transition-colors"
      >
        <span>←</span>
        <span>Back to course</span>
      </a>

      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="aspect-[16/9] rounded-lg overflow-hidden bg-bg-tertiary">
          <Image
            src={thumbnailUrl}
            alt={title}
            width={560}
            height={315}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Overline */}
      {overlineParts.length > 0 && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-teal">
          {overlineParts.join(' · ')}
        </p>
      )}

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-serif text-fg-primary leading-tight">
        {title}
      </h1>

      {/* Description */}
      {description && (
        <p className="text-fg-secondary text-sm leading-relaxed line-clamp-3">
          {description}
        </p>
      )}

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-fg-primary">
          {priceFormatted}
        </span>
        {secondaryPriceFormatted && (
          <span className="text-sm text-fg-tertiary">
            / {secondaryPriceFormatted}
          </span>
        )}
      </div>

      {/* Start date + scarcity */}
      <div className="flex flex-wrap gap-4 text-sm">
        {startDateFormatted && (
          <span className="text-fg-secondary">Starts {startDateFormatted}</span>
        )}
        {spotsRemaining !== null && (
          <span className={scarcityColor}>
            {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining
          </span>
        )}
      </div>

      {/* Learning outcomes */}
      {outcomesToShow.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
            What you&apos;ll master
          </p>
          <ul className="space-y-1.5">
            {outcomesToShow.map((outcome, i) => (
              <li key={i} className="flex gap-2 text-sm text-fg-secondary">
                <span className="text-accent-teal mt-0.5 shrink-0">✓</span>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructor mini-card */}
      {instructor && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border-default">
          {instructor.photo_url ? (
            <Image
              src={instructor.photo_url}
              alt={instructor.display_name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-bg-tertiary shrink-0 flex items-center justify-center text-fg-tertiary text-sm">
              {instructor.display_name[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg-primary truncate">
              {instructor.display_name}
            </p>
            {(locale === 'ja' ? instructor.bio_short_jp : null) ??
            instructor.bio_short_en ? (
              <p className="text-xs text-fg-tertiary line-clamp-1">
                {(locale === 'ja' ? instructor.bio_short_jp : null) ??
                  instructor.bio_short_en}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Trust strip */}
      <div className="flex items-center gap-2 text-xs text-fg-muted pt-2 border-t border-border-default">
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>Secure checkout · 14-day refund policy</span>
      </div>
    </div>
  );
}
