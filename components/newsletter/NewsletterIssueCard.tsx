import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type NewsletterIssueCardProps = {
  title: string;
  excerpt: string;
  slug: { current: string };
  issueNumber: number;
  publishedAt: string;
  readingTime?: number;
  locale: string;
  issueLabel: string;
  readIssueLabel: string;
  readingTimeLabel?: string;
};

export function NewsletterIssueCard({
  title,
  excerpt,
  slug,
  issueNumber,
  publishedAt,
  readingTime,
  locale,
  issueLabel,
  readIssueLabel,
  readingTimeLabel,
}: NewsletterIssueCardProps) {
  const formattedDate = new Intl.DateTimeFormat(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  ).format(new Date(publishedAt));

  return (
    <Link
      href={`/newsletter/${slug.current}`}
      className={cn(
        'group block py-6',
        'border-b border-border-secondary',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:bg-bg-tertiary px-3 -mx-3 rounded',
      )}
    >
      {/* Metadata row */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-fg-tertiary">
        <div className="flex items-center gap-2">
          <span className="font-mono">{issueLabel}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={publishedAt}>{formattedDate}</time>
        </div>
        {readingTime != null && readingTimeLabel && (
          <span>{readingTimeLabel}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-serif text-h3 font-normal text-fg-primary mt-2 group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
        {title}
      </h3>

      {/* Excerpt */}
      <p className="text-sm text-fg-secondary mt-1 line-clamp-2">
        {excerpt}
      </p>

      {/* CTA */}
      <span className="inline-block text-sm text-accent-teal mt-3">
        {readIssueLabel} →
      </span>
    </Link>
  );
}
