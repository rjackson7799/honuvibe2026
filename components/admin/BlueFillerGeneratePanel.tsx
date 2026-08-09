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
    <div className="rounded-xl border border-border-primary bg-bg-secondary p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-fg-primary">Generate an idea</h2>
        <p className="text-[11px] text-fg-muted">priors reviewed {priorsReviewedAt}</p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Generation mode">
        {(['cold', 'acquirer'] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-[44px] px-4 rounded-lg text-sm font-medium border transition-colors ${
              mode === value
                ? 'border-[color:var(--border-accent)] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]'
                : 'border-border-primary text-fg-secondary hover:border-border-hover'
            }`}
          >
            {value === 'cold' ? 'Cold' : 'Acquirer-first'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bf-industry" className="block text-xs font-semibold text-fg-secondary">
          Industry
        </label>
        <select
          id="bf-industry"
          value={industryKey}
          onChange={(event) => setIndustryKey(event.target.value)}
          className="w-full min-h-[44px] text-base rounded-lg border border-border-primary bg-bg-primary px-3 text-fg-primary"
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
        <label htmlFor="bf-seed" className="block text-xs font-semibold text-fg-secondary">
          Seed from a source <span className="font-normal text-fg-muted">(optional)</span>
        </label>
        <textarea
          id="bf-seed"
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          rows={4}
          placeholder="Paste an article, a transcript excerpt, or a note…"
          className="w-full text-base rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-fg-primary"
        />
        <p className="text-[11px] text-fg-muted">
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

      {error && <p className="text-sm text-[color:var(--accent-coral)]">{error}</p>}

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={busy || seedTooShort}
        className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-lg bg-[color:var(--accent-teal)] text-white text-sm font-semibold disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {busy ? 'Generating…' : 'Generate idea'}
      </button>
    </div>
  );
}
