import type { RsvpStatus } from '@/lib/events/types';

export interface RsvpStatusLabels {
  needed: string;
  going: string;
  notGoing: string;
}

/** Small colored pill conveying the viewer's RSVP state at a glance. */
export function RsvpStatusPill({
  status,
  labels,
}: {
  status: RsvpStatus;
  labels: RsvpStatusLabels;
}) {
  const config: Record<RsvpStatus, { text: string; cls: string }> = {
    invited: {
      text: labels.needed,
      cls: 'bg-[color:var(--accent-gold)]/10 text-[color:var(--accent-gold)]',
    },
    going: { text: labels.going, cls: 'bg-accent-teal/10 text-accent-teal' },
    not_going: { text: labels.notGoing, cls: 'bg-bg-tertiary text-fg-tertiary' },
  };
  const { text, cls } = config[status];

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`}
    >
      {text}
    </span>
  );
}
