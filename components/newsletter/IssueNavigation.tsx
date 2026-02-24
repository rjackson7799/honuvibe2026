import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type IssueNavigationProps = {
  prev?: {
    title: string;
    slug: { current: string };
    issueNumber: number;
  };
  next?: {
    title: string;
    slug: { current: string };
    issueNumber: number;
  };
  prevLabel: string;
  nextLabel: string;
};

export function IssueNavigation({ prev, next, prevLabel, nextLabel }: IssueNavigationProps) {
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Issue navigation"
      className={cn(
        'flex flex-col gap-6 md:flex-row md:justify-between md:gap-8',
        'border-t border-border-default py-8 mt-8',
      )}
    >
      {/* Previous */}
      <div className="md:max-w-[45%]">
        {prev && (
          <Link
            href={`/newsletter/${prev.slug.current}`}
            className="group block"
          >
            <span className="block text-xs text-fg-tertiary uppercase tracking-wider">
              {prevLabel}
            </span>
            <span className="block text-sm text-fg-primary mt-1 line-clamp-1 group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
              {prev.title}
            </span>
          </Link>
        )}
      </div>

      {/* Next */}
      <div className="md:max-w-[45%] md:text-right md:ml-auto">
        {next && (
          <Link
            href={`/newsletter/${next.slug.current}`}
            className="group block"
          >
            <span className="block text-xs text-fg-tertiary uppercase tracking-wider">
              {nextLabel}
            </span>
            <span className="block text-sm text-fg-primary mt-1 line-clamp-1 group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
              {next.title}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
