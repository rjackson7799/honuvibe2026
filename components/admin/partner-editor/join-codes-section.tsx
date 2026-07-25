'use client';

import { useState } from 'react';
import { Copy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/editor-shell/section-card';
import {
  inputClass,
  labelClass,
  selectClass,
  hintClass,
} from '@/components/admin/editor-shell/field-classes';
import type { JoinCodeRow, SeatBlockRow } from './types';

type Props = {
  partnerId: string;
  initialCodes: JoinCodeRow[];
  seatBlocks: SeatBlockRow[];
};

/**
 * Join codes.
 *
 * Usage is read from the redemption ledger — there is no counter column to get
 * out of sync. Codes are bearer credentials by design: possession is the right
 * to join, which is why they deactivate rather than delete (usage history has
 * to survive) and why redemption still requires an authenticated session.
 */
export function JoinCodesSection({ partnerId, initialCodes, seatBlocks }: Props) {
  const [codes, setCodes] = useState<JoinCodeRow[]>(initialCodes);
  const [creating, setCreating] = useState(false);
  const [seatBlockId, setSeatBlockId] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  async function refresh() {
    const res = await fetch(`/api/admin/partners/${partnerId}/join-codes`);
    if (res.ok) {
      const data = (await res.json()) as { codes: JoinCodeRow[] };
      setCodes(data.codes);
    }
  }

  async function create() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/join-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat_block_id: seatBlockId || null,
          max_uses: maxUses ? Number(maxUses) : null,
          expires_at: expiresAt
            ? new Date(`${expiresAt}T23:59:59.000Z`).toISOString()
            : null,
        }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not create the code');
        return;
      }
      setMessage(`Created ${data.code}`);
      setCreating(false);
      setSeatBlockId('');
      setMaxUses('');
      setExpiresAt('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the code');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: JoinCodeRow) {
    if (
      row.is_active &&
      !confirm(`Deactivate ${row.code}? Anyone holding the link can no longer join.`)
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/partners/${partnerId}/join-codes/${row.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !row.is_active }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Update failed');
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${origin}/join/${code}`);
      setMessage(`Copied the /join/${code} link`);
    } catch {
      setError('Clipboard unavailable — copy the code manually');
    }
  }

  return (
    <SectionCard id="join-codes" number={7} title="Join codes">
      <p className="text-sm text-fg-tertiary">
        Share <code className="rounded bg-bg-tertiary px-1.5 py-0.5 text-xs">/join/CODE</code>{' '}
        and anyone with a HonuVibe account joins this partner community. Link a
        seat block to hand out a sponsored Vault seat at the same time.
      </p>

      {codes.length === 0 ? (
        <p className="text-sm italic text-fg-tertiary">No join codes yet.</p>
      ) : (
        <ul className="divide-y divide-border-default rounded-lg border border-border-default bg-bg-tertiary">
          {codes.map((row) => {
            const block = seatBlocks.find((b) => b.id === row.seat_block_id);
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm text-fg-primary">
                    {row.code}
                    {!row.is_active && (
                      <span className="ml-2 font-sans text-xs text-fg-tertiary">
                        (inactive)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-fg-tertiary">
                    {row.uses}
                    {row.max_uses === null ? ' uses' : ` / ${row.max_uses} uses`}
                    {block ? ` · seats: ${block.label}` : ' · no seat'}
                    {row.expires_at
                      ? ` · expires ${new Date(row.expires_at).toLocaleDateString('en-US')}`
                      : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Copy}
                    onClick={() => void copyLink(row.code)}
                  >
                    Copy link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void toggleActive(row)}
                  >
                    {row.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <div className="space-y-3 rounded-lg border border-border-default bg-bg-tertiary p-3">
          <label className="block">
            <span className={labelClass}>Seat block (optional)</span>
            <select
              className={selectClass}
              value={seatBlockId}
              onChange={(e) => setSeatBlockId(e.target.value)}
            >
              <option value="">No seat — membership only</option>
              {seatBlocks
                .filter((b) => b.is_active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.seats_used}/{b.seats_total} used)
                  </option>
                ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Max uses (optional)</span>
              <input
                className={inputClass}
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Expires (optional)</span>
              <input
                className={inputClass}
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
          </div>
          <p className={hintClass}>
            The code itself is generated for you from an unambiguous alphabet and
            cannot be changed later — a shared link must never quietly retarget.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void create()}>
              {busy ? 'Creating…' : 'Create code'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setCreating(false);
                setError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" icon={Plus} onClick={() => setCreating(true)}>
          New join code
        </Button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-accent-teal">{message}</p>}
    </SectionCard>
  );
}
