import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const statusStyles: Record<string, string> = {
  // Course statuses
  draft: 'bg-bg-tertiary text-fg-tertiary',
  proposal: 'bg-accent-gold/10 text-accent-gold',
  published: 'bg-accent-teal/10 text-accent-teal',
  'in-progress': 'bg-accent-gold/10 text-accent-gold',
  completed: 'bg-bg-tertiary text-fg-secondary',
  archived: 'bg-bg-tertiary text-fg-tertiary',
  rejected: 'bg-red-500/10 text-red-400',
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
  // Library video statuses
  featured: 'bg-accent-gold/10 text-accent-gold',
  open: 'bg-accent-teal/10 text-accent-teal',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  proposal: 'Proposal',
  published: 'Published',
  'in-progress': 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
  rejected: 'Rejected',
  active: 'Active',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  received: 'Received',
  reviewing: 'Reviewing',
  responded: 'Responded',
  upcoming: 'Upcoming',
  live: 'Live',
  featured: 'Featured',
  open: 'Open',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-bg-tertiary text-fg-tertiary';
  const label = statusLabels[status] ?? status.replace(/-/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
