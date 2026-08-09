'use client';

// Blue Filler — web-grounded deep research. "Run research" POSTs to the 202 +
// after() route, then polls GET ?poll=1 every 5s until the row leaves
// 'generating', then does one full GET to refresh history and a router.refresh()
// so the idea's revised scores appear.
//
// The interval is cleared on unmount AND guarded by aliveRef, so a navigation
// mid-run never leaves a fetch loop running or sets state on a dead component.
// Findings are model output derived from arbitrary web pages, so all markdown
// renders through the sanitized CommunityMarkdown.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Loader2 } from 'lucide-react';
import { CommunityMarkdown } from '@/lib/community/markdown';
import { StatusBadge } from './StatusBadge';
import type {
  BlueFillerIdea,
  BlueFillerResearch,
  ResearchSummary,
} from '@/lib/blue-filler/types';

const POLL_MS = 5000;

const ERROR_LABELS: Record<string, string> = {
  search_failed: 'Web research produced nothing usable.',
  no_citations: 'The research found no citable sources.',
  structuring_failed: 'The findings could not be structured into a report.',
  truncated: 'The research hit its token limit before finishing.',
  timeout: 'The run ran out of time.',
  provider_error: 'The model provider returned an error.',
  internal: 'Something went wrong during the run.',
};

export function BlueFillerResearchPanel({ idea }: { idea: BlueFillerIdea }) {
  const router = useRouter();
  const [latest, setLatest] = useState<BlueFillerResearch | null>(null);
  const [history, setHistory] = useState<ResearchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);

  const archived = idea.status === 'archived';

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (aliveRef.current) setRunning(false);
  }

  async function loadFull() {
    try {
      const res = await fetch(`/api/admin/blue-filler/ideas/${idea.id}/research`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? 'Failed to load research.');
        return;
      }
      setLatest(data.latest ?? null);
      setHistory(data.history ?? []);
      if (data.latest?.status === 'generating') startPolling();
    } catch {
      if (aliveRef.current) setError('Failed to load research.');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }

  async function poll() {
    try {
      const res = await fetch(`/api/admin/blue-filler/ideas/${idea.id}/research?poll=1`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        stopPolling();
        setError(data.error ?? 'Research polling failed.');
        return;
      }
      setLatest(data.latest ?? null);
      if (!data.latest || data.latest.status !== 'generating') {
        stopPolling();
        void loadFull();
        // A completed run rewrites the idea's scores, composite and grade.
        router.refresh();
      }
    } catch {
      // Transient network blip — keep polling; a persistent failure surfaces on
      // the next full load.
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    setRunning(true);
    pollRef.current = setInterval(() => void poll(), POLL_MS);
  }

  useEffect(() => {
    aliveRef.current = true;
    void loadFull();
    return () => {
      aliveRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.id]);

  async function handleRun() {
    setError('');
    setRunning(true);
    try {
      const res = await fetch(`/api/admin/blue-filler/ideas/${idea.id}/research`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setRunning(false);
        setError(data.error ?? 'Failed to start research.');
        return;
      }
      startPolling();
      void loadFull();
    } catch {
      if (aliveRef.current) {
        setRunning(false);
        setError('Failed to start research.');
      }
    }
  }

  const generating = latest?.status === 'generating' || running;

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-semibold text-fg-primary">Deep research</h2>
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={generating || archived}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
          {generating ? 'Researching…' : latest ? 'Run again' : 'Run research'}
        </button>
      </div>

      <p className="text-[11px] text-fg-muted">
        Runs live web searches through Opus 5 and rewrites the sub-scores from what it finds.
        Roughly $0.50–1.00 per run.
      </p>

      {archived && (
        <p className="text-[11px] text-fg-muted">
          This idea is archived — un-archive it to run research.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      <div aria-live="polite">
        {loading ? (
          <p className="text-sm text-fg-tertiary">Loading…</p>
        ) : !latest ? (
          <p className="text-sm text-fg-tertiary">No research yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={latest.status} />
              <span className="text-[11px] text-fg-muted">
                {latest.search_count} search{latest.search_count === 1 ? '' : 'es'} ·{' '}
                {latest.citations?.length ?? 0} source
                {(latest.citations?.length ?? 0) === 1 ? '' : 's'}
              </span>
            </div>

            {latest.status === 'generating' && (
              <p className="text-sm text-fg-tertiary">
                Searching the web and reading sources. This usually takes two to four minutes.
              </p>
            )}

            {latest.generation_error && (
              <p className="text-sm text-[color:var(--accent-gold)]">
                {ERROR_LABELS[latest.generation_error] ?? latest.generation_error}
              </p>
            )}

            {latest.summary_md && <CommunityMarkdown body={latest.summary_md} />}

            {!latest.summary_md && latest.raw_findings_md && (
              <div>
                <h3 className="text-xs font-semibold text-fg-secondary">Raw findings</h3>
                <div className="mt-2">
                  <CommunityMarkdown body={latest.raw_findings_md} />
                </div>
              </div>
            )}

            {latest.model_id && (
              <p className="text-[11px] text-fg-muted">
                {latest.model_id} · {latest.pipeline_version}
              </p>
            )}
          </div>
        )}
      </div>

      {history.length > 1 && (
        <details className="pt-2 border-t border-border-default">
          <summary className="text-xs font-semibold text-fg-secondary cursor-pointer py-1.5 flex items-center">
            Previous runs ({history.length - 1})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {history.slice(1).map((run) => (
              <li key={run.id} className="flex items-center gap-2 text-[11px] text-fg-muted">
                <StatusBadge status={run.status} />
                <span>{new Date(run.created_at).toLocaleString('en-US')}</span>
                <span>
                  · {run.search_count} search{run.search_count === 1 ? '' : 'es'} ·{' '}
                  {run.citation_count} source{run.citation_count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
