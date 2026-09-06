'use client';

// Reverse-chron engagement_events with a note composer. Events are
// append-only (067): the only thing this component ever changes on an
// existing row is resolved_at, via the Resolve button on an attention item.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './StatusBadge';
import { addEngagementNote, resolveEngagementEvent } from '@/lib/studio/engagement/engagement-actions';
import { formatDateTime } from '@/lib/studio/engagement/format';
import type { EngagementEvent } from '@/lib/admin/types';
import type { EngagementEventKind } from '@/lib/studio/engagement/types';

const KIND_LABELS: Record<EngagementEventKind, string> = {
  stage_changed: 'Stage',
  note: 'Note',
  questionnaire_drafted: 'Questionnaire drafted',
  questionnaire_tailored: 'Questionnaire tailored',
  questionnaire_ready: 'Questionnaire ready',
  questionnaire_back_to_draft: 'Questionnaire back to draft',
  questionnaire_sent: 'Questionnaire sent',
  questionnaire_opened: 'Questionnaire opened',
  questionnaire_submitted: 'Questionnaire submitted',
  questionnaire_reopened: 'Questionnaire reopened',
  questionnaire_revoked: 'Link revoked',
  questionnaire_reset: 'Questionnaire reset',
  brief_generated: 'Brief',
  brief_failed: 'Brief failed',
  notification_sent: 'Notification sent',
  notification_failed: 'Notification failed',
  proposal_drafted: 'Proposal created',
  proposal_ai_drafted: 'Proposal drafted by AI',
  proposal_ai_failed: 'Proposal AI draft failed',
  proposal_ready: 'Proposal ready',
  proposal_back_to_draft: 'Proposal back to draft',
  proposal_sent: 'Proposal issued',
  proposal_opened: 'Proposal opened',
  proposal_accepted: 'Proposal accepted',
  proposal_acceptance_voided: 'Acceptance voided',
  proposal_withdrawn: 'Proposal withdrawn',
  proposal_superseded: 'Proposal superseded',
  proposal_revoked: 'Proposal link revoked',
  // 075. "Invoice", not "Deposit": the same kinds label the 100%
  // "build investment" case and, later, the balance and care rows.
  invoice_issued: 'Invoice issued',
  invoice_paid: 'Invoice paid',
  invoice_payment_failed: 'Payment failed',
  invoice_duplicate_payment: 'Duplicate payment',
  invoice_refunded: 'Invoice refunded',
  invoice_voided: 'Invoice voided',
  deliverables_seeded: 'Deliverables seeded',
  deliverable_delivered: 'Deliverable delivered',
};

const ACTOR_LABELS: Record<EngagementEvent['actor'], string> = {
  admin: 'you',
  client: 'client',
  system: 'system',
};

export function EngagementTimeline({
  engagementId,
  events,
}: {
  engagementId: string;
  events: EngagementEvent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function handleAddNote() {
    const body = note.trim();
    if (!body || pending) return;
    setError('');
    startTransition(async () => {
      try {
        await addEngagementNote(engagementId, body);
        setNote('');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add the note.');
      }
    });
  }

  function handleResolve(eventId: string) {
    if (pending) return;
    setError('');
    startTransition(async () => {
      try {
        await resolveEngagementEvent(eventId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to resolve the item.');
      }
    });
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <h2 className="text-[14px] font-bold text-fg-primary">Timeline</h2>

      <div className="space-y-2">
        <label htmlFor="engagement-note" className="block text-[13px] font-medium text-fg-secondary">
          Add a note
        </label>
        <textarea
          id="engagement-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Call notes, what they said, what you promised…"
          className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-base sm:text-sm placeholder:text-fg-tertiary focus:border-accent-teal outline-none"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleAddNote}
            disabled={pending || note.trim() === ''}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {pending ? 'Saving…' : 'Add note'}
          </button>
          {error && <span className="text-[13px] text-[color:var(--accent-coral)]">{error}</span>}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-[13px] text-fg-tertiary">No activity yet.</p>
      ) : (
        <ol className="space-y-3 border-t border-border-default pt-3">
          {events.map((ev) => {
            const open = ev.needs_attention && !ev.resolved_at;
            return (
              <li key={ev.id} className="flex items-start gap-3">
                <span
                  className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                    open ? 'bg-[color:var(--accent-coral)]' : 'bg-fg-tertiary'
                  }`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-[12px] text-fg-tertiary">
                    <span className="font-semibold text-fg-secondary">{KIND_LABELS[ev.kind] ?? ev.kind}</span>
                    <span>· {ACTOR_LABELS[ev.actor] ?? ev.actor}</span>
                    <span>· {formatDateTime(ev.created_at)}</span>
                    {ev.needs_attention && (
                      <span className={open ? 'text-[color:var(--accent-coral)] font-semibold' : ''}>
                        · {open ? 'needs attention' : 'resolved'}
                      </span>
                    )}
                  </div>
                  {ev.kind === 'stage_changed' ? (
                    <div className="flex items-center gap-2 flex-wrap text-[13px] text-fg-secondary">
                      {ev.from_stage ? (
                        <>
                          <StatusBadge status={ev.from_stage} />
                          <span aria-hidden>→</span>
                        </>
                      ) : null}
                      {ev.to_stage && <StatusBadge status={ev.to_stage} />}
                      {!ev.from_stage && <span className="text-fg-tertiary">{ev.summary}</span>}
                    </div>
                  ) : (
                    <p className="text-[13px] text-fg-secondary whitespace-pre-wrap">{ev.summary}</p>
                  )}
                  {open && (
                    <button
                      type="button"
                      onClick={() => handleResolve(ev.id)}
                      disabled={pending}
                      className="inline-flex items-center min-h-[44px] text-[12px] font-semibold text-[color:var(--accent-teal)] hover:underline disabled:opacity-50"
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
