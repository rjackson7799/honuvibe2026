'use client';

// What the build owes (slice 4B, migration 075). Two groups — Build and
// Launch — each row inline-editable: title on click, a status <select> that
// moves in both directions, a due date, a notes disclosure, delete with
// confirm.
//
// "Seed from proposal scope" is offered only while the panel is EMPTY and an
// accepted proposal exists: seeding twice would duplicate the same bullets,
// and once Ryan has curated the list the scope is no longer the better source.
// It is REVIEW-FIRST — the candidates arrive as an editable checklist and
// nothing is written until Ryan confirms the count.
//
// The client never sees any of this (decision 7): it is Ryan's build plan.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import {
  addDeliverables,
  deleteDeliverable,
  previewDeliverablesFromScope,
  updateDeliverable,
} from '@/lib/studio/engagement/deliverable-actions';
import { formatShortDate } from '@/lib/studio/engagement/format';
import { DELIVERABLE_STATUSES } from '@/lib/studio/engagement/types';
import type { EngagementDeliverable } from '@/lib/admin/types';

const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';
const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all';
const input =
  'w-full px-3 py-2 min-h-[44px] rounded-lg bg-bg-primary border border-border-default text-fg-primary text-base sm:text-sm focus:border-accent-teal outline-none';

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  delivered: 'Delivered',
  accepted: 'Accepted',
};

type Candidate = { title: string; checked: boolean };

export function EngagementDeliverablesPanel({
  engagementId,
  deliverables,
  hasAcceptedProposal,
}: {
  engagementId: string;
  /** Every deliverable, already ordered by phase then sort_order. */
  deliverables: EngagementDeliverable[];
  /** Seeding needs a scope to read; without one the button is not offered. */
  hasAcceptedProposal: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPhase, setNewPhase] = useState<'build' | 'launch'>('build');
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  // The seed review state: null = not seeding.
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [seedProposalId, setSeedProposalId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const groups = useMemo(
    () => ({
      build: deliverables.filter((d) => d.phase === 'build'),
      launch: deliverables.filter((d) => d.phase === 'launch'),
    }),
    [deliverables],
  );
  const canSeed = hasAcceptedProposal && deliverables.length === 0;
  const working = pending || seeding;

  function run(label: string, fn: () => Promise<string | void>) {
    setError('');
    setNotice('');
    startTransition(async () => {
      try {
        const message = await fn();
        if (message) setNotice(message);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : `${label} failed.`);
      }
    });
  }

  async function handleSeed() {
    setError('');
    setNotice('');
    setSeeding(true);
    try {
      const preview = await previewDeliverablesFromScope(engagementId);
      if (preview.candidates.length === 0) {
        setError("The accepted proposal's scope has no bullet list to read — add deliverables by hand.");
        return;
      }
      setSeedProposalId(preview.proposalId);
      setCandidates(preview.candidates.map((c) => ({ title: c.title, checked: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read the scope.');
    } finally {
      setSeeding(false);
    }
  }

  function confirmSeed() {
    const rows = (candidates ?? [])
      .filter((c) => c.checked && c.title.trim() !== '')
      .map((c) => ({ title: c.title.trim(), phase: 'build' as const }));
    if (rows.length === 0) {
      setError('Nothing selected.');
      return;
    }
    run('Seed', async () => {
      const { added } = await addDeliverables(engagementId, rows, seedProposalId);
      setCandidates(null);
      setSeedProposalId(null);
      return `${added} deliverable${added === 1 ? '' : 's'} added under Build.`;
    });
  }

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) {
      setError('A title is required.');
      return;
    }
    run('Add', async () => {
      await addDeliverables(engagementId, [{ title, phase: newPhase }]);
      setNewTitle('');
      setAdding(false);
    });
  }

  const selectedCount = (candidates ?? []).filter((c) => c.checked && c.title.trim() !== '').length;

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4" data-deliverables-panel>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Deliverables</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {canSeed && (
            <button type="button" onClick={handleSeed} disabled={working} className={ghostBtn}>
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Seed from proposal scope
            </button>
          )}
          <button type="button" onClick={() => setAdding((v) => !v)} disabled={working} className={ghostBtn}>
            Add deliverable
          </button>
        </div>
      </div>

      {candidates && (
        <div className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-3" data-seed-review>
          <p className="text-[12px] text-fg-tertiary">
            From the accepted proposal&rsquo;s scope. Uncheck anything that is not a deliverable, edit the wording,
            then add them. Nothing is saved until you do.
          </p>
          <ul className="space-y-2">
            {candidates.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.checked}
                  aria-label={`Include ${c.title}`}
                  onChange={(e) =>
                    setCandidates((prev) =>
                      (prev ?? []).map((p, j) => (j === i ? { ...p, checked: e.target.checked } : p)),
                    )
                  }
                  className="h-4 w-4 shrink-0"
                />
                <input
                  value={c.title}
                  maxLength={200}
                  onChange={(e) =>
                    setCandidates((prev) => (prev ?? []).map((p, j) => (j === i ? { ...p, title: e.target.value } : p)))
                  }
                  className={input}
                />
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={confirmSeed} disabled={working || selectedCount === 0} className={primaryBtn}>
              {pending ? 'Adding…' : `Add ${selectedCount} deliverable${selectedCount === 1 ? '' : 's'}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setCandidates(null);
                setSeedProposalId(null);
              }}
              disabled={working}
              className={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {adding && (
        <div className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={200}
            placeholder="Homepage redesign"
            aria-label="Deliverable title"
            className={input}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={newPhase}
              onChange={(e) => setNewPhase(e.target.value as 'build' | 'launch')}
              aria-label="Phase"
              className={`${input} w-auto`}
            >
              <option value="build">Build</option>
              <option value="launch">Launch</option>
            </select>
            <button type="button" onClick={handleAdd} disabled={working} className={primaryBtn}>
              Add
            </button>
            <button type="button" onClick={() => setAdding(false)} disabled={working} className={ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {deliverables.length === 0 && !candidates && (
        <p className="text-[13px] text-fg-tertiary">
          Nothing listed yet.{' '}
          {canSeed
            ? "Seed from the accepted proposal's scope, or add them by hand."
            : 'Add what this build owes so the launch gate can warn you about anything still open.'}
        </p>
      )}

      {(['build', 'launch'] as const).map((phase) =>
        groups[phase].length === 0 ? null : (
          <div key={phase} className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
              {phase === 'build' ? 'Build' : 'Launch'}
            </p>
            <ul className="space-y-2">
              {groups[phase].map((d) => (
                // The key carries updated_at so the uncontrolled inputs below
                // (title, due date, notes) REMOUNT when the server row changes.
                // Keyed on id alone they would keep their first-mount value
                // forever, and a router.refresh() from any other action would
                // leave this row silently showing stale text.
                <li
                  key={`${d.id}:${d.updated_at}`}
                  className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-2"
                  data-deliverable
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <input
                      defaultValue={d.title}
                      maxLength={200}
                      aria-label={`Title of ${d.title}`}
                      onBlur={(e) => {
                        const title = e.target.value.trim();
                        if (title && title !== d.title) run('Rename', () => updateDeliverable(d.id, { title }));
                      }}
                      className="flex-1 min-w-[200px] min-h-[44px] bg-transparent text-base sm:text-[13.5px] font-medium text-fg-primary outline-none focus:underline"
                    />
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[12px] text-fg-tertiary">
                    <select
                      value={d.status}
                      disabled={working}
                      aria-label={`Status of ${d.title}`}
                      onChange={(e) =>
                        run('Status', () =>
                          updateDeliverable(d.id, { status: e.target.value as (typeof DELIVERABLE_STATUSES)[number] }),
                        )
                      }
                      className="min-h-[44px] px-2 rounded-md bg-bg-secondary border border-border-default text-base sm:text-[12px] text-fg-secondary"
                    >
                      {DELIVERABLE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-1">
                      Due
                      <input
                        type="date"
                        defaultValue={d.due_on ?? ''}
                        disabled={working}
                        aria-label={`Due date of ${d.title}`}
                        onChange={(e) => run('Due date', () => updateDeliverable(d.id, { due_on: e.target.value || null }))}
                        className="min-h-[44px] px-2 rounded-md bg-bg-secondary border border-border-default text-base sm:text-[12px] text-fg-secondary"
                      />
                    </label>
                    {d.delivered_at && <span>Delivered {formatShortDate(d.delivered_at)}</span>}
                    <button
                      type="button"
                      onClick={() => setOpenNotes(openNotes === d.id ? null : d.id)}
                      className="underline hover:no-underline"
                    >
                      {d.notes_md ? 'Notes' : 'Add notes'}
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      aria-label={`Delete ${d.title}`}
                      onClick={() => {
                        if (!window.confirm(`Delete “${d.title}”? This cannot be undone.`)) return;
                        run('Delete', () => deleteDeliverable(d.id));
                      }}
                      className="inline-flex items-center gap-1 text-[color:var(--accent-coral)] hover:underline disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                  {openNotes === d.id && (
                    <textarea
                      defaultValue={d.notes_md ?? ''}
                      maxLength={4000}
                      rows={3}
                      aria-label={`Notes for ${d.title}`}
                      placeholder="Anything worth remembering about this item."
                      onBlur={(e) => {
                        const notes = e.target.value.trim();
                        if (notes !== (d.notes_md ?? '')) run('Notes', () => updateDeliverable(d.id, { notes_md: notes || null }));
                      }}
                      className={input}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}

      {notice && (
        <div className="rounded-lg border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}
    </section>
  );
}
