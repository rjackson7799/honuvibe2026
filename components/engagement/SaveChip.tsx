'use client';

// The ONE autosave indicator: Saving… / Saved · 4 min ago / Unsaved — retry.
// Lives in the sticky header; never a toast. The relative time ticks every
// 30 s so "Saved · just now" ages honestly.

import { useEffect, useState } from 'react';
import { Check, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useQuestionnaire } from './QuestionnaireProvider';

function relative(at: number, now: number, t: ReturnType<typeof useQuestionnaire>['t']): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return t.justNow;
  const m = Math.floor(s / 60);
  if (m < 60) return t.minAgo(m);
  return t.hoursAgo(Math.floor(m / 60));
}

export function SaveChip() {
  const { chip, t, retryFailed, submitted } = useQuestionnaire();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (chip.kind === 'saved') setNow(Date.now());
  }, [chip]);

  if (submitted || chip.kind === 'idle') return null;

  const base = 'inline-flex items-center gap-1.5 rounded-full px-3 min-h-[32px] text-[12.5px] font-semibold whitespace-nowrap';

  if (chip.kind === 'saving') {
    return (
      <span className={`${base} bg-[rgba(26,43,51,0.06)] text-[var(--m-ink-secondary)]`} role="status" aria-live="polite">
        <Loader2 size={13} className="animate-spin" aria-hidden /> {t.saving}
      </span>
    );
  }
  if (chip.kind === 'saved') {
    return (
      <span className={`${base} bg-[rgba(15,169,160,0.10)] text-[var(--m-accent-teal)]`} role="status" aria-live="polite">
        <Check size={13} aria-hidden /> {t.savedAgo(relative(chip.at, now, t))}
      </span>
    );
  }
  if (chip.kind === 'offline') {
    return (
      <span className={`${base} bg-[rgba(232,118,90,0.10)] text-[var(--m-accent-coral)]`} role="status" aria-live="polite">
        <CloudOff size={13} aria-hidden /> {t.offline}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={retryFailed}
      className={`${base} min-h-[44px] bg-[rgba(232,118,90,0.12)] text-[var(--m-accent-coral)] hover:bg-[rgba(232,118,90,0.2)]`}
      aria-live="assertive"
    >
      <RefreshCw size={13} aria-hidden /> {t.unsaved}
    </button>
  );
}
