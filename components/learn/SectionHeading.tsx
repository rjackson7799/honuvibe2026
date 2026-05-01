import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  title: string;
  icon?: React.ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  bordered?: boolean;
};

export function SectionHeading({
  title,
  icon,
  viewAllHref,
  viewAllLabel = 'View all',
  className,
  bordered = false,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 mb-4',
        bordered && 'pb-3 border-b border-border-default',
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-fg-primary shrink-0">{icon}</span>}
        <h2 className="text-[15px] sm:text-[17px] font-bold text-fg-primary tracking-[-0.015em] truncate">
          {title}
        </h2>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors shrink-0"
        >
          {viewAllLabel}
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
