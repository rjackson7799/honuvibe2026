import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const tealPill = 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]';
const coralPill = 'bg-[color:var(--accent-coral-subtle)] text-[color:var(--accent-coral)]';
const grayPill = 'bg-[rgba(26,43,51,0.06)] text-fg-secondary';
const mutedPill = 'bg-[rgba(26,43,51,0.04)] text-fg-tertiary';
const dangerPill = 'bg-red-500/10 text-red-500';

const statusStyles: Record<string, string> = {
  // Course statuses
  draft: mutedPill,
  proposal: coralPill,
  published: tealPill,
  'in-progress': coralPill,
  completed: grayPill,
  archived: mutedPill,
  rejected: dangerPill,
  // Enrollment statuses
  active: tealPill,
  cancelled: dangerPill,
  refunded: mutedPill,
  // Application statuses
  received: coralPill,
  reviewing: tealPill,
  responded: grayPill,
  // Session statuses
  upcoming: coralPill,
  live: tealPill,
  // Library video statuses
  featured: coralPill,
  open: tealPill,
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
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-[0.04em]',
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
