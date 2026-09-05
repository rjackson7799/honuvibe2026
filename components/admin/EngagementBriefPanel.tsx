'use client';

// The discovery brief panel — a near-literal fork of StudioLeadAuditPanel's
// polling machinery: POLL_MS 5000, pollRef/aliveRef, GET ?poll=1 while the
// latest brief is 'generating', stop + one full reload on a terminal status,
// cleanup on unmount. Regenerate POSTs the atomic-insert route (23505 → 409).
// Everything model-generated renders through CommunityMarkdown — never
// dangerouslySetInnerHTML. A brief older than the questionnaire's
// submitted_at is marked "from a previous submission".

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Loader2, Sparkles } from 'lucide-react';
import { CommunityMarkdown } from '@/lib/community/markdown';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '@/lib/studio/engagement/format';
import type { EngagementBrief } from '@/lib/admin/types';
import type { EngagementBriefSummary } from '@/lib/admin/queries';

const POLL_MS = 5000;

const ERROR_COPY: Record<string, string> = {
  timeout: 'The narrative timed out.',
  provider_error: 'The AI call failed.',
  malformed_output: 'The AI returned an unusable brief.',
  digest_failed: 'The answers snapshot could not be rendered.',
  missing_key: 'AI briefs are not configured (ANTHROPIC_API_KEY).',
  internal: 'Something went wrong on our side.',
};

const mdCls =
  'text-[13px] text-fg-secondary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_h1]:text-[15px] [&_h1]:font-bold [&_h1]:text-fg-primary [&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:text-fg-primary [&_h2]:mt-3 [&_strong]:text-fg-primary [&_a]:text-[color:var(--accent-teal)] [&_a]:underline';

interface Structured {
  one_liner?: string;
  questions_for_call?: string[];
  confidence_note?: string;
}

export function EngagementBriefPanel({
  engagementId,
  questionnaireSubmittedAt,
  canGenerate,
}: {
  engagementId: string;
  questionnaireSubmittedAt: string | null;
  /** false until the questionnaire has an answer_snapshot. */
  canGenerate: boolean;
}) {
  const [latest, setLatest] = useState<EngagementBrief | null>(null);
  const [history, setHistory] = useState<EngagementBriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDigest, setShowDigest] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (aliveRef.current) setRunning(false);
  }

  async function loadFull() {
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}/brief`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? 'Failed to load briefs.');
        return;
      }
      setLatest(data.latest ?? null);
      setHistory(data.history ?? []);
      if (data.latest?.status === 'generating') startPolling();
    } catch {
      if (aliveRef.current) setError('Failed to load briefs.');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }

  async function poll() {
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}/brief?poll=1`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        stopPolling();
        setError(data.error ?? 'Brief polling failed.');
        return;
      }
      setLatest(data.latest ?? null);
      if (!data.latest || data.latest.status !== 'generating') {
        stopPolling();
        void loadFull();
      }
    } catch {
      // Transient network blip — keep polling; a persistent failure surfaces via the next full load.
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
  }, [engagementId, questionnaireSubmittedAt]);

  async function handleRun() {
    setError('');
    setRunning(true);
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}/brief`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to start the brief.');
        setRunning(false);
        return;
      }
      startPolling();
      void poll();
    } catch {
      setError('Failed to start the brief.');
      setRunning(false);
    }
  }

  async function handleCopy() {
    const text = latest?.brief_md ?? latest?.digest_md;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy failed — your browser blocked clipboard access.');
    }
  }

  const structured = (latest?.structured ?? null) as Structured | null;
  const stale =
    !!latest && !!questionnaireSubmittedAt && new Date(latest.created_at).getTime() < new Date(questionnaireSubmittedAt).getTime();

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Discovery brief</h2>
        <button
          type="button"
          onClick={handleRun}
          disabled={!canGenerate || running}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {running ? 'Generating…' : latest ? 'Regenerate' : 'Generate brief'}
        </button>
      </div>

      {!canGenerate && (
        <p className="text-[13px] text-fg-tertiary">The brief is generated automatically when the client submits the questionnaire. While it is open with the client (reopened), wait for the resubmission.</p>
      )}
      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-fg-tertiary">Loading…</p>
      ) : !latest ? (
        canGenerate && <p className="text-[13px] text-fg-tertiary">No brief yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={latest.status} />
              <span className="text-[12px] text-fg-tertiary">{formatDateTime(latest.created_at)}</span>
              {stale && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">from a previous submission</span>
              )}
              {latest.model_id && <span className="text-[11px] text-fg-tertiary">· {latest.model_id}</span>}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!latest.brief_md && !latest.digest_md}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-[color:var(--accent-teal)]" /> Copied ✓
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy {latest.brief_md ? 'brief' : 'digest'}
                </>
              )}
            </button>
          </div>

          {latest.status === 'generating' && (
            <p className="text-[13px] text-fg-tertiary">Reading the answers and writing the brief — usually under two minutes…</p>
          )}
          {latest.status === 'failed' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-fg-secondary">
              Brief could not be generated. {ERROR_COPY[latest.generation_error ?? 'internal'] ?? ''} Regenerate to try again.
            </div>
          )}
          {latest.status === 'partial' && (
            <div className="rounded-lg border border-[color:var(--accent-gold)]/30 bg-[color:var(--accent-gold-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
              The narrative failed ({ERROR_COPY[latest.generation_error ?? 'internal'] ?? 'unknown'}) — the answers digest below is complete.{' '}
              <button type="button" onClick={handleRun} disabled={running} className="underline hover:no-underline disabled:opacity-50">
                Regenerate
              </button>{' '}
              to retry the write-up.
            </div>
          )}

          {structured?.one_liner && latest.brief_md && (
            <p className="text-[14px] font-medium text-fg-primary">{structured.one_liner}</p>
          )}

          {latest.brief_md && (
            <div className="rounded-lg border border-border-default bg-bg-primary p-4">
              <div className={mdCls}>
                <CommunityMarkdown body={latest.brief_md} />
              </div>
            </div>
          )}

          {latest.digest_md && (
            <div>
              <button
                type="button"
                onClick={() => setShowDigest((v) => !v)}
                className="inline-flex items-center gap-1 min-h-[44px] text-[12px] text-fg-tertiary hover:text-fg-secondary"
              >
                <ChevronDown size={13} className={showDigest ? 'rotate-180 transition-transform' : 'transition-transform'} />
                Answers digest {latest.brief_md ? '(phase 1, deterministic)' : ''}
              </button>
              {(showDigest || !latest.brief_md) && (
                <div className="mt-2 rounded-lg border border-border-default bg-bg-primary p-4">
                  <div className={mdCls}>
                    <CommunityMarkdown body={latest.digest_md} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {history.length > 1 && (
        <div className="border-t border-border-default pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 min-h-[44px] text-[12px] text-fg-tertiary hover:text-fg-secondary"
          >
            <ChevronDown size={13} className={showHistory ? 'rotate-180 transition-transform' : 'transition-transform'} />
            Brief history ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-fg-tertiary">{formatDateTime(h.created_at)}</span>
                  <span className="flex items-center gap-2">
                    {h.generation_error && <span className="text-fg-tertiary">{h.generation_error}</span>}
                    <StatusBadge status={h.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
