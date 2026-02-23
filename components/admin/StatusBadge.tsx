import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const statusStyles: Record<string, string> = {
  // Course statuses
  draft: 'bg-bg-tertiary text-fg-tertiary',
  published: 'bg-accent-teal/10 text-accent-teal',
  'in-progress': 'bg-accent-gold/10 text-accent-gold',
  completed: 'bg-bg-tertiary text-fg-secondary',
  archived: 'bg-bg-tertiary text-fg-tertiary',
  // Enrollment statuses
  active: 'bg-accent-teal/10 text-accent-teal',
  cancelled: 'bg-red-500/10 text-red-400',
  refunded: 'bg-bg-tertiary text-fg-tertiary',
  // Application statuses
  received: 'bg-accent-gold/10 text-accent-gold',
  reviewing: 'bg-accent-teal/10 text-accent-teal',
  responded: 'bg-bg-tertiary text-fg-secondary',
  // Session statuses
  upcoming: 'bg-accent-gold/10 text-accent-gold',
  live: 'bg-accent-teal/10 text-accent-teal',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-bg-tertiary text-fg-tertiary';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
        style,
        className,
      )}
    >
      {status.replace(/-/g, ' ')}
    </span>
  );
}
