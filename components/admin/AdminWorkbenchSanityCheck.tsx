'use client';

// Evaluator sanity-check widget (publish panel): scores the CURRENT draft's
// expert prompt with the real member evaluator. Advisory only — it never blocks
// publish; a weak score means the "expert" prompt needs work before members
// compare themselves against it.

import { useState } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import type { EvaluateAttemptResult } from '@/lib/workbench/evaluator';
import type { WorkbenchDimension } from '@/lib/workbench/types';

type Props = {
  brief: string;
  expertPrompt: string;
  expertOutput: string;
  dimensions: WorkbenchDimension[];
};

export function AdminWorkbenchSanityCheck({
  brief,
  expertPrompt,
  expertOutput,
  dimensions,
}: Props) {
  const [result, setResult] = useState<EvaluateAttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready =
    brief.trim() !== '' &&
    expertPrompt.trim() !== '' &&
    expertOutput.trim() !== '' &&
    dimensions.length > 0;

  async function handleCheck() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/workbench/sanity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          expert_prompt: expertPrompt,
          expert_output: expertOutput,
          applicable_dimensions: dimensions,
          language: 'en',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Sanity check failed.');
        return;
      }
      setResult(data as EvaluateAttemptResult);
    } catch {
      setError('Sanity check failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 pt-1 border-t border-border-default">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary">
        Expert prompt check
      </p>
      <button
        type="button"
        onClick={handleCheck}
        disabled={busy || !ready}
        className="inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-[10px] bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors w-full"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
        {busy ? 'Scoring…' : 'Check expert prompt'}
      </button>
      {error && (
        <p className="text-[12px] text-[color:var(--accent-coral)]">{error}</p>
      )}
      {result && (
        <div className="space-y-2">
          <p className="text-[13px] text-fg-primary font-bold">
            {result.overallScore}
            <span className="text-fg-tertiary font-medium">/100</span>
          </p>
          <div className="flex gap-1 flex-wrap">
            {dimensions.map((d) => {
              const score = result.scores[d];
              return (
                <span
                  key={d}
                  className="px-1.5 py-0.5 rounded-full text-[11px] font-medium capitalize bg-bg-primary border border-border-default text-fg-secondary"
                >
                  {d} {score ?? '–'}/5
                </span>
              );
            })}
          </div>
          {result.improvements.length > 0 && (
            <ul className="space-y-1">
              {result.improvements.map((line) => (
                <li key={line} className="text-[12px] text-fg-secondary leading-[1.5]">
                  • {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-[11.5px] text-fg-tertiary leading-[1.5]">
        Advisory — a strong expert prompt should score 90+. Does not block publish.
      </p>
    </div>
  );
}
