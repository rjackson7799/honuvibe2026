'use client';

// Blue Filler — the adversarial kill memo. Synchronous POST; a failure leaves
// the previously stored memo on screen and untouched in the DB (success-only
// overwrite). The memo is model output, so its markdown renders through the
// sanitized CommunityMarkdown — never dangerouslySetInnerHTML.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Skull } from 'lucide-react';
import { CommunityMarkdown } from '@/lib/community/markdown';
import type { BlueFillerIdea, KillMemo } from '@/lib/blue-filler/types';

export function BlueFillerKillMemoPanel({ idea }: { idea: BlueFillerIdea }) {
  const router = useRouter();
  const [memo, setMemo] = useState<KillMemo | null>(idea.kill_memo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const archived = idea.status === 'archived';

  async function handleRun() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/blue-filler/ideas/${idea.id}/kill-memo`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? 'Kill memo generation failed.');
        return;
      }
      setMemo(data.kill_memo as KillMemo);
      router.refresh();
    } catch {
      if (aliveRef.current) setError('Kill memo generation failed.');
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-semibold text-fg-primary">Kill memo</h2>
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={busy || archived}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Skull size={13} />}
          {busy ? 'Writing…' : memo ? 'Regenerate' : 'Write kill memo'}
        </button>
      </div>

      {archived && (
        <p className="text-[11px] text-fg-muted">
          This idea is archived — un-archive it to generate a new memo.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      {!memo ? (
        <p className="text-sm text-fg-tertiary">
          No memo yet. This asks Claude to argue, as hard as it can, that this idea fails.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.04em] font-semibold text-fg-muted">
            Leans{' '}
            <span
              className={
                memo.verdict_lean === 'kill'
                  ? 'text-[color:var(--accent-coral)]'
                  : 'text-[color:var(--accent-teal)]'
              }
            >
              {memo.verdict_lean}
            </span>
          </p>

          <div>
            <h3 className="text-xs font-semibold text-fg-secondary">Fatal flaws</h3>
            <ul className="mt-2 space-y-1.5">
              {memo.fatal_flaws.map((flaw, index) => (
                <li key={index} className="text-sm text-fg-secondary flex gap-2">
                  <span className="text-[color:var(--accent-coral)]">▸</span>
                  <span>{flaw}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-fg-secondary">Strongest case for it</h3>
            <p className="mt-1 text-sm text-fg-secondary">{memo.strongest_counterargument}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-fg-secondary">Cheapest disproof</h3>
            <p className="mt-1 text-sm text-fg-secondary">{memo.cheapest_disproof}</p>
          </div>

          <div className="pt-2 border-t border-border-default">
            <CommunityMarkdown body={memo.memo_md} />
          </div>

          <p className="text-[11px] text-fg-muted">
            {memo.model_id} · {memo.pipeline_version}
          </p>
        </div>
      )}
    </section>
  );
}
