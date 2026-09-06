'use client';

// The stage control: a segmented five-button control over the ACTIVE stages
// (not a <select>), plus two separate ghost actions with confirm — Mark lost
// (needs a reason) and Close engagement. When the engagement is terminal the
// segmented control still renders: clicking any active stage is the reopen
// path, with its own confirm. Any transition is allowed — one operator,
// fifteen engagements, a state machine here only produces "why won't it let
// me". The anchors, the event and the leads.sales_stage mirror are all
// trigger-side (067); this component only ever writes `stage` (+ lost_reason).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './StatusBadge';
import { setEngagementStage } from '@/lib/studio/engagement/engagement-actions';
import {
  ACTIVE_ENGAGEMENT_STAGES,
  SALES_STAGE_LABELS,
  STAGE_LABELS,
  isTerminalStage,
  salesStageFor,
  type EngagementStage,
} from '@/lib/studio/engagement/stages';
import { daysSince, formatShortDate } from '@/lib/studio/engagement/format';
import type { Engagement } from '@/lib/admin/types';

const ghostBtn =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';

export function EngagementStageControl({
  engagement,
  openBuildDeliverables,
}: {
  engagement: Engagement;
  /**
   * Undelivered BUILD-phase deliverables (075). A SOFT gate: leaving `build`
   * with any of these warns and asks for one extra confirm — it never blocks.
   * 067's stage trigger stays the only stage authority, and there is no
   * server-side check to match this (decision 7).
   */
  openBuildDeliverables?: { count: number; titles: string[] };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [lostMode, setLostMode] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const current = engagement.stage;
  const terminal = isTerminalStage(current);
  const days = daysSince(engagement.stage_entered_at);

  function move(stage: EngagementStage, opts?: { lostReason?: string }) {
    setError('');
    startTransition(async () => {
      try {
        await setEngagementStage(engagement.id, stage, opts);
        setLostMode(false);
        setLostReason('');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to change the stage.');
      }
    });
  }

  /**
   * The soft launch gate. It warns on build -> care and build -> closed too,
   * not only build -> launch (judgment call 6): skipping launch entirely with
   * open build items is the same mistake in a different button.
   */
  function confirmOpenBuildItems(targetLabel: string): boolean {
    const open = openBuildDeliverables;
    if (current !== 'build' || !open || open.count === 0) return true;
    const shown = open.titles.slice(0, 5).join(', ');
    const more = open.titles.length > 5 ? ', …' : '';
    return window.confirm(
      `${open.count} build deliverable${open.count === 1 ? ' is' : 's are'} not delivered yet: ${shown}${more}. Move to ${targetLabel} anyway?`,
    );
  }

  function handleActive(stage: EngagementStage) {
    if (stage === current || pending) return;
    if (terminal) {
      const ok = window.confirm(
        `Reopen this engagement at ${STAGE_LABELS[stage]}? The ${STAGE_LABELS[current].toLowerCase()} record stays in the timeline.`,
      );
      if (!ok) return;
    }
    if ((stage === 'launch' || stage === 'care') && !confirmOpenBuildItems(STAGE_LABELS[stage])) return;
    move(stage);
  }

  function handleClose() {
    if (pending) return;
    if (!confirmOpenBuildItems(STAGE_LABELS.closed)) return;
    const ok = window.confirm(
      'Close this engagement? Use this when a care plan ended amicably — it stays in the won bucket. Mark lost is for deals that did not happen.',
    );
    if (!ok) return;
    move('closed');
  }

  function handleConfirmLost() {
    const reason = lostReason.trim();
    if (!reason) {
      setError('A reason is required to mark an engagement lost.');
      return;
    }
    move('lost', { lostReason: reason });
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Stage</h2>
        {terminal && (
          <span className="inline-flex items-center gap-2">
            <StatusBadge status={current} />
            {current === 'lost' && engagement.lost_reason && (
              <span className="text-[12px] text-fg-tertiary">— {engagement.lost_reason}</span>
            )}
          </span>
        )}
      </div>

      <div
        role="group"
        aria-label="Engagement stage"
        className="flex flex-wrap gap-1 rounded-lg border border-border-default bg-bg-primary p-1"
      >
        {ACTIVE_ENGAGEMENT_STAGES.map((stage) => {
          const active = stage === current;
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => handleActive(stage)}
              className={`flex-1 min-w-[88px] min-h-[44px] px-3 rounded-md text-[12.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50 ${
                active
                  ? 'bg-accent-teal/10 text-accent-teal'
                  : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
              }`}
            >
              {STAGE_LABELS[stage]}
            </button>
          );
        })}
      </div>

      {terminal ? (
        <p className="text-[12px] text-fg-tertiary">
          Pick an active stage above to reopen this engagement.
        </p>
      ) : lostMode ? (
        <div className="space-y-2">
          <label htmlFor="engagement-lost-reason" className="block text-[13px] font-medium text-fg-secondary">
            Why was it lost?
          </label>
          <input
            id="engagement-lost-reason"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            maxLength={1000}
            placeholder="Went with a DIY builder, budget fell through, no reply…"
            className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-bg-primary border border-border-default text-fg-primary text-base sm:text-sm focus:border-accent-teal outline-none"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleConfirmLost}
              disabled={pending || lostReason.trim() === ''}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-coral)] text-white text-[12.5px] font-semibold disabled:opacity-50 transition-colors"
            >
              {pending ? 'Saving…' : 'Confirm — mark lost'}
            </button>
            <button
              type="button"
              onClick={() => {
                setLostMode(false);
                setLostReason('');
                setError('');
              }}
              disabled={pending}
              className={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setLostMode(true)} disabled={pending} className={ghostBtn}>
            Mark lost
          </button>
          <button type="button" onClick={handleClose} disabled={pending} className={ghostBtn}>
            Close engagement
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      <p className="text-[12px] text-fg-tertiary">
        Stage since {formatShortDate(engagement.stage_entered_at)} · {days} day{days === 1 ? '' : 's'} · mirrors to
        lead status &ldquo;{SALES_STAGE_LABELS[salesStageFor(current)]}&rdquo;
      </p>
    </section>
  );
}
