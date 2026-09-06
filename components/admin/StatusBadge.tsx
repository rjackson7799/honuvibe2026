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
const goldPill = 'bg-[color:var(--accent-gold-subtle)] text-[color:var(--accent-gold)]';

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
  inactive: mutedPill,
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
  // Studio lead statuses (proposal shared above)
  new: coralPill,
  qualified: tealPill,
  won: tealPill,
  lost: mutedPill,
  // 1v1 session-report statuses
  generating: coralPill,
  review: coralPill,
  failed: dangerPill,
  // Lead-audit partial (heuristics saved, narrative failed) — amber from the gold token
  partial: goldPill,
  // Prospect statuses ('new' shared above)
  scoring: coralPill,
  scored: tealPill,
  no_website: goldPill,
  score_failed: dangerPill,
  converted: grayPill,
  dismissed: mutedPill,
  // Blue Filler idea statuses ('new' and 'archived' shared above) + verdicts
  shortlist: tealPill,
  interested: tealPill,
  // grayPill, not mutedPill: a 'pass' verdict renders next to an 'archived'
  // status on the detail page, and two identical grey pills read as one state.
  pass: grayPill,
  // Engagement stages ('proposal' and 'lost' shared above). Discovery is the
  // opening move (teal), build/launch are in-flight (coral/gold), care is the
  // steady state (teal), closed is finished-amicably (grey — not a loss).
  discovery: tealPill,
  build: coralPill,
  launch: goldPill,
  care: tealPill,
  closed: grayPill,
  // Questionnaire statuses ('draft' shared above)
  ready: tealPill,
  sent: coralPill,
  in_progress: coralPill,
  submitted: tealPill,
  // Proposal statuses ('draft', 'ready', 'sent' shared above). Accepted is
  // the win (teal); voided is a reversed win (danger); superseded/withdrawn
  // are history (muted).
  accepted: tealPill,
  voided: dangerPill,
  superseded: mutedPill,
  withdrawn: mutedPill,
  // Invoice statuses (075) — 'draft', 'sent' and 'refunded' are shared above.
  // Paid is the money landing (teal); void is a retired row (muted, not
  // danger: voiding an unpaid invoice is routine housekeeping).
  paid: tealPill,
  void: mutedPill,
  // Deliverable statuses (075) — 'in_progress' and 'accepted' shared above.
  planned: mutedPill,
  delivered: tealPill,
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
  inactive: 'Inactive',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  received: 'Received',
  reviewing: 'Reviewing',
  responded: 'Responded',
  upcoming: 'Upcoming',
  live: 'Live',
  featured: 'Featured',
  open: 'Open',
  new: 'New',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
  generating: 'Generating',
  review: 'In Review',
  failed: 'Failed',
  partial: 'Partial',
  scoring: 'Scoring',
  scored: 'Scored',
  no_website: 'No Website',
  score_failed: 'Score Failed',
  converted: 'Converted',
  dismissed: 'Dismissed',
  shortlist: 'Shortlist',
  interested: 'Interested',
  pass: 'Pass',
  discovery: 'Discovery',
  build: 'Build',
  launch: 'Launch',
  care: 'Care',
  closed: 'Closed',
  ready: 'Ready',
  sent: 'Sent',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  accepted: 'Accepted',
  voided: 'Voided',
  superseded: 'Superseded',
  withdrawn: 'Withdrawn',
  paid: 'Paid',
  void: 'Void',
  planned: 'Planned',
  delivered: 'Delivered',
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
