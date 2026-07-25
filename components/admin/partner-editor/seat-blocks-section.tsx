'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/editor-shell/section-card';
import {
  inputClass,
  labelClass,
  selectClass,
  hintClass,
} from '@/components/admin/editor-shell/field-classes';
import type { SeatBlockRow } from './types';

type Props = {
  partnerId: string;
  initialBlocks: SeatBlockRow[];
};

type Draft = {
  label: string;
  seats_total: string;
  /** Full ISO timestamps, NOT date strings — see draftFrom below. */
  access_starts_at: string;
  access_ends_at: string;
  source: 'sponsored' | 'purchased';
  notes: string;
  is_active: boolean;
};

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** A bare date from <input type="date"> is read as midnight UTC. */
function fromDateInput(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function emptyDraft(): Draft {
  const now = new Date();
  const inAYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  return {
    label: '',
    seats_total: '25',
    access_starts_at: now.toISOString(),
    access_ends_at: inAYear.toISOString(),
    source: 'sponsored',
    notes: '',
    is_active: true,
  };
}

/**
 * The draft carries the block's EXACT stored timestamps, not date-only strings.
 * `access_starts_at` is immutable once a seat has been granted, and truncating
 * it to midnight would count as a change — so an untouched date field has to
 * round-trip byte-for-byte. Only an actual date pick replaces the value.
 */
function draftFrom(block: SeatBlockRow): Draft {
  return {
    label: block.label,
    seats_total: String(block.seats_total),
    access_starts_at: block.access_starts_at,
    access_ends_at: block.access_ends_at,
    source: block.source,
    notes: block.notes ?? '',
    is_active: block.is_active,
  };
}

/**
 * Seat blocks (Vault-only in v1).
 *
 * Every edit rule — immutable fields after the first grant, the seats_total
 * floor, the shorten/deactivate confirmation — is enforced by the
 * `upsert_seat_block` RPC against the live grant count. This UI only surfaces
 * what the RPC decides; it never pre-judges, because a check here would race a
 * redemption happening at the same moment.
 */
export function SeatBlocksSection({ partnerId, initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<SeatBlockRow[]>(initialBlocks);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    const res = await fetch(`/api/admin/partners/${partnerId}/seat-blocks`);
    if (res.ok) {
      const data = (await res.json()) as { blocks: SeatBlockRow[] };
      setBlocks(data.blocks);
    }
  }

  async function save(blockId: string | null, confirmImpact = false) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        label: draft.label.trim(),
        seats_total: Number(draft.seats_total),
        granted_tier: 'vault' as const,
        access_starts_at: draft.access_starts_at,
        access_ends_at: draft.access_ends_at,
        source: draft.source,
        notes: draft.notes.trim() || null,
        ...(blockId ? { is_active: draft.is_active, confirm_impact: confirmImpact } : {}),
      };

      const res = await fetch(
        blockId
          ? `/api/admin/partners/${partnerId}/seat-blocks/${blockId}`
          : `/api/admin/partners/${partnerId}/seat-blocks`,
        {
          method: blockId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        outcome?: string;
        active_grants?: number;
      };

      if (!res.ok) {
        if (data.outcome === 'confirm_required' && !confirmImpact) {
          const ok = confirm(
            `This shortens or disables access for ${data.active_grants ?? 0} member(s) currently holding a seat. Continue?`,
          );
          if (ok) {
            setBusy(false);
            await save(blockId, true);
            return;
          }
          setBusy(false);
          return;
        }
        setError(data.error ?? 'Save failed');
        return;
      }

      setMessage(blockId ? 'Seat block updated' : 'Seat block created');
      setCreating(false);
      setEditingId(null);
      setDraft(emptyDraft());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(block: SeatBlockRow) {
    if (
      !confirm(
        `Deactivate "${block.label}"? This is a kill switch: ${block.seats_used} member(s) lose Vault access immediately. Seat records are preserved.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/partners/${partnerId}/seat-blocks/${block.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: block.label,
            seats_total: block.seats_total,
            granted_tier: 'vault',
            access_starts_at: block.access_starts_at,
            access_ends_at: block.access_ends_at,
            source: block.source,
            notes: block.notes,
            is_active: false,
            confirm_impact: true,
            reason: 'Deactivated from the admin partner editor',
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Deactivate failed');
        return;
      }
      setMessage('Seat block deactivated');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const editor = (blockId: string | null) => (
    <div className="space-y-3 rounded-lg border border-border-default bg-bg-tertiary p-3">
      <label className="block">
        <span className={labelClass}>Label</span>
        <input
          className={inputClass}
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="2026 sponsored cohort"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Seats</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={draft.seats_total}
            onChange={(e) => setDraft({ ...draft, seats_total: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Access starts</span>
          <input
            className={inputClass}
            type="date"
            value={toDateInput(draft.access_starts_at)}
            onChange={(e) =>
              setDraft({ ...draft, access_starts_at: fromDateInput(e.target.value) })
            }
          />
        </label>
        <label className="block">
          <span className={labelClass}>Access ends</span>
          <input
            className={inputClass}
            type="date"
            value={toDateInput(draft.access_ends_at)}
            onChange={(e) =>
              setDraft({ ...draft, access_ends_at: fromDateInput(e.target.value) })
            }
          />
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Source</span>
        <select
          className={selectClass}
          value={draft.source}
          onChange={(e) =>
            setDraft({ ...draft, source: e.target.value as Draft['source'] })
          }
        >
          <option value="sponsored">Sponsored (partner pays us off-platform)</option>
          <option value="purchased">Purchased</option>
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Notes</span>
        <input
          className={inputClass}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </label>
      <p className={hintClass}>
        Grants Vault only — Community comes with membership itself. Access ends
        at the start of the end date (exclusive).
      </p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={busy || !draft.label.trim()}
          onClick={() => void save(blockId)}
        >
          {busy ? 'Saving…' : blockId ? 'Save changes' : 'Create block'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            setCreating(false);
            setEditingId(null);
            setError('');
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <SectionCard id="seat-blocks" number={6} title="Seat blocks">
      <p className="text-sm text-fg-tertiary">
        Blocks of sponsored Vault seats this partner can hand out through a join
        code or an invite. Seats never grant Community — membership already does.
      </p>

      {blocks.length === 0 ? (
        <p className="text-sm italic text-fg-tertiary">No seat blocks yet.</p>
      ) : (
        <ul className="space-y-2">
          {blocks.map((block) => {
            const pct =
              block.seats_total > 0
                ? Math.min(100, Math.round((block.seats_used / block.seats_total) * 100))
                : 0;
            return (
              <li
                key={block.id}
                className="rounded-lg border border-border-default bg-bg-tertiary p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg-primary">
                      {block.label}
                      {!block.is_active && (
                        <span className="ml-2 text-xs text-fg-tertiary">(inactive)</span>
                      )}
                    </div>
                    <div className="text-xs text-fg-tertiary">
                      {block.source} · vault ·{' '}
                      {new Date(block.access_starts_at).toLocaleDateString('en-US')} →{' '}
                      {new Date(block.access_ends_at).toLocaleDateString('en-US')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setCreating(false);
                        setEditingId(block.id);
                        setDraft(draftFrom(block));
                      }}
                    >
                      Edit
                    </Button>
                    {block.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void deactivate(block)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-secondary"
                    role="img"
                    aria-label={`${block.seats_used} of ${block.seats_total} seats used`}
                  >
                    <div
                      className="h-full rounded-full bg-accent-teal"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs text-fg-secondary">
                    {block.seats_used}/{block.seats_total}
                  </span>
                </div>

                {editingId === block.id && <div className="mt-3">{editor(block.id)}</div>}
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        editor(null)
      ) : (
        <Button
          variant="ghost"
          size="sm"
          icon={Plus}
          disabled={busy}
          onClick={() => {
            setEditingId(null);
            setDraft(emptyDraft());
            setCreating(true);
          }}
        >
          New seat block
        </Button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-accent-teal">{message}</p>}
    </SectionCard>
  );
}
