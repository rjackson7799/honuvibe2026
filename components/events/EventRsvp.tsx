'use client';

import { useState } from 'react';
import { setRsvp } from '@/lib/events/actions';
import type { RsvpStatus } from '@/lib/events/types';

export interface EventRsvpLabels {
  question: string;
  prompt: string;
  going: string;
  notGoing: string;
  saved: string;
  change: string;
  statusGoing: string;
  statusNotGoing: string;
}

export function EventRsvp({
  invitationId,
  initialStatus,
  labels,
}: {
  invitationId: string;
  initialStatus: RsvpStatus;
  labels: EventRsvpLabels;
}) {
  const [status, setStatus] = useState<RsvpStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function choose(next: RsvpStatus) {
    if (busy || next === status) return;
    setBusy(true);
    setSaved(false);
    try {
      await setRsvp(invitationId, next);
      setStatus(next);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const answered = status !== 'invited';

  // Unanswered → accent treatment so a first-time visitor can't miss it.
  const cardCls = answered
    ? 'rounded-xl border border-border-default bg-bg-secondary p-5'
    : 'rounded-xl border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold)]/5 p-5';

  const heading =
    status === 'going'
      ? `${labels.statusGoing} ✓`
      : status === 'not_going'
        ? labels.statusNotGoing
        : labels.question;

  const pill = (active: boolean) =>
    `h-11 px-5 rounded-[10px] text-sm font-semibold transition-colors disabled:opacity-50 ${
      active
        ? 'bg-[color:var(--accent-teal)] text-white'
        : 'bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover'
    }`;

  return (
    <section className={cardCls}>
      <p className="text-sm font-semibold text-fg-primary">{heading}</p>
      <p className="text-[13px] text-fg-secondary mb-3">{answered ? labels.change : labels.prompt}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={pill(status === 'going')} disabled={busy} onClick={() => choose('going')}>
          {labels.going}
        </button>
        <button type="button" className={pill(status === 'not_going')} disabled={busy} onClick={() => choose('not_going')}>
          {labels.notGoing}
        </button>
      </div>
      {saved && <p className="text-[12px] text-accent-teal mt-2">{labels.saved}</p>}
    </section>
  );
}
