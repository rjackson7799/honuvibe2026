'use client';

// Blue Filler — the generate control. POSTs synchronously to
// /api/admin/blue-filler/generate and navigates to the new idea on success.
//
// A FRESH request_id is minted per click: each deliberate click is a genuinely
// new idea. The request_id makes the SERVER side idempotent if that one submit
// is retried; it is NOT double-click protection — the `busy` flag and the
// disabled button are what stop a second paid generation.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { INDUSTRY_MAP } from '@/lib/blue-filler/industry-map';
import { SEED_EXCERPT_MAX, SEED_MIN_LENGTH } from '@/lib/blue-filler/types';

type Mode = 'cold' | 'acquirer';

export function BlueFillerGeneratePanel({ priorsReviewedAt }: { priorsReviewedAt: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('cold');
  const [industryKey, setIndustryKey] = useState('');
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const trimmedSeed = seed.trim();
  const seedTooShort = trimmedSeed.length > 0 && trimmedSeed.length < SEED_MIN_LENGTH;

  async function handleGenerate() {
    if (busy || seedTooShort) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/blue-filler/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: crypto.randomUUID(),
          ...(industryKey ? { industry_key: industryKey } : {}),
          ...(mode === 'acquirer' ? { mode } : {}),
          ...(trimmedSeed ? { source_text: trimmedSeed } : {}),
        }),
      });
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? 'Generation failed.');
        setBusy(false);
        return;
      }
      router.push(`/admin/blue-filler/${data.idea.id}`);
      router.refresh();
    } catch {
      if (aliveRef.current) {
        setError('Generation failed.');
        setBusy(false);
      }
    }
  }

  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-semibold text-fg-primary">Generate an idea</h2>
        <p className="text-[11px] text-fg-tertiary">priors reviewed {priorsReviewedAt}</p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Generation mode">
        {(['cold', 'acquirer'] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              mode === value
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {value === 'cold' ? 'Cold' : 'Acquirer-first'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bf-industry" className="block text-[12px] font-medium text-fg-secondary">
          Industry
        </label>
        <select
          id="bf-industry"
          value={industryKey}
          onChange={(event) => setIndustryKey(event.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
        >
          <option value="">Let Claude choose</option>
          {INDUSTRY_MAP.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bf-seed" className="block text-[12px] font-medium text-fg-secondary">
          Seed from a source <span className="text-fg-tertiary">(optional)</span>
        </label>
        <textarea
          id="bf-seed"
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          rows={4}
          placeholder="Paste an article, a transcript excerpt, or a note…"
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
        <p className="text-[11px] text-fg-tertiary">
          This text is sent to the Anthropic API and the first {SEED_EXCERPT_MAX} characters are
          stored on the idea. Do not paste secrets, credentials, client-confidential material, or
          regulated personal data.
        </p>
        {seedTooShort && (
          <p className="text-[11px] text-[color:var(--accent-coral)]">
            Seed text needs at least {SEED_MIN_LENGTH} characters.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={busy || seedTooShort}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {busy ? 'Generating…' : 'Generate idea'}
      </button>
    </div>
  );
}
