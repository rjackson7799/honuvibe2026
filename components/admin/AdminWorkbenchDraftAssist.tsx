'use client';

// "Draft with AI" card for the New Scenario form: a one-line idea + domain +
// difficulty produce a full English draft that prefills the form. Never saves
// anything — the admin edits and creates as usual.

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  WORKBENCH_DOMAINS,
  WORKBENCH_DIFFICULTIES,
  type WorkbenchDifficulty,
  type WorkbenchDomain,
} from '@/lib/workbench/types';
import type { WorkbenchDraftResult } from '@/lib/workbench/authoring';

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-sm focus:border-accent-teal outline-none';

type Props = {
  /** True when the form already has English content (confirm before clobbering). */
  hasExistingContent: boolean;
  onApply: (
    draft: WorkbenchDraftResult,
    domain: WorkbenchDomain,
    difficulty: WorkbenchDifficulty,
  ) => void;
};

export function AdminWorkbenchDraftAssist({ hasExistingContent, onApply }: Props) {
  const [idea, setIdea] = useState('');
  const [domain, setDomain] = useState<WorkbenchDomain>(WORKBENCH_DOMAINS[0]);
  const [difficulty, setDifficulty] = useState<WorkbenchDifficulty>(
    WORKBENCH_DIFFICULTIES[0],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDraft() {
    if (
      hasExistingContent &&
      !window.confirm('Drafting with AI will replace the current English fields. Continue?')
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/workbench/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), domain, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Draft assist failed.');
        return;
      }
      onApply(data as WorkbenchDraftResult, domain, difficulty);
    } catch {
      setError('Draft assist failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-[color:var(--accent-teal)]" />
        <h2 className="text-[14px] font-bold text-fg-primary">Draft with AI</h2>
      </div>
      <p className="text-[12.5px] text-fg-secondary leading-[1.5]">
        Describe the scenario in one line — the assistant drafts the English
        brief, expert prompt, expert output, and dimensions for you to edit.
      </p>
      <div className="grid sm:grid-cols-[1fr,150px,150px] gap-3">
        <input
          className={inputCls}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. cold outreach email for a dentist office"
        />
        <select
          className={inputCls}
          value={domain}
          onChange={(e) => setDomain(e.target.value as WorkbenchDomain)}
        >
          {WORKBENCH_DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as WorkbenchDifficulty)}
        >
          {WORKBENCH_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleDraft}
        disabled={busy || idea.trim().length < 4}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold disabled:opacity-50 transition-all"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {busy ? 'Drafting…' : 'Draft with AI'}
      </button>
      {error && (
        <p className="text-[12.5px] text-[color:var(--accent-coral)]">{error}</p>
      )}
    </section>
  );
}
