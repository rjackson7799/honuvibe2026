'use client';

// Website-audit workspace for a lead (edit-mode only). "Run audit" POSTs to the
// 202 + after() route, then polls GET ?poll=1 every ~5s until the row leaves
// 'generating', then does one full GET to refresh history. Renders the latest
// audit (scores, findings by severity, PageSpeed, and the Claude narrative) and
// a copy-paste summary. The narrative is model output derived from an
// attacker-controlled site, so it renders through the sanitized CommunityMarkdown
// (react-markdown + rehype-sanitize) — never dangerouslySetInnerHTML.

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Loader2, Sparkles } from 'lucide-react';
import { CommunityMarkdown } from '@/lib/community/markdown';
import { StatusBadge } from './StatusBadge';
import type { LeadAudit, LeadAuditFinding, StudioLeadDetail } from '@/lib/admin/types';
import type { LeadAuditSummary } from '@/lib/admin/queries';

const POLL_MS = 5000;

const CATEGORY_ORDER: LeadAuditFinding['category'][] = [
  'security',
  'seo',
  'mobile',
  'conversion',
  'freshness',
  'accessibility',
];
const CATEGORY_LABEL: Record<LeadAuditFinding['category'], string> = {
  security: 'Security',
  seo: 'SEO',
  mobile: 'Mobile',
  conversion: 'Conversion',
  freshness: 'Freshness',
  accessibility: 'Accessibility',
};

function scoreColor(n: number): string {
  if (n >= 80) return 'text-[color:var(--accent-teal)]';
  if (n >= 50) return 'text-[color:var(--accent-gold)]';
  return 'text-[color:var(--accent-coral)]';
}

function severityDot(sev: LeadAuditFinding['severity']): string {
  if (sev === 'critical') return 'bg-[color:var(--accent-coral)]';
  if (sev === 'warn') return 'bg-[color:var(--accent-gold)]';
  return 'bg-fg-tertiary';
}

export function StudioLeadAuditPanel({ lead }: { lead: StudioLeadDetail }) {
  const [latest, setLatest] = useState<LeadAudit | null>(null);
  const [history, setHistory] = useState<LeadAuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPassing, setShowPassing] = useState(false);

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
      const res = await fetch(`/api/admin/studio-leads/${lead.id}/audit`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? 'Failed to load audits.');
        return;
      }
      setLatest(data.latest ?? null);
      setHistory(data.history ?? []);
      if (data.latest?.status === 'generating') startPolling();
    } catch {
      if (aliveRef.current) setError('Failed to load audits.');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }

  async function poll() {
    try {
      const res = await fetch(`/api/admin/studio-leads/${lead.id}/audit?poll=1`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        stopPolling();
        setError(data.error ?? 'Audit polling failed.');
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
  }, [lead.id]);

  async function handleRun() {
    setError('');
    setRunning(true);
    try {
      const res = await fetch(`/api/admin/studio-leads/${lead.id}/audit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to start the audit.');
        setRunning(false);
        return;
      }
      startPolling();
      void poll();
    } catch {
      setError('Failed to start the audit.');
      setRunning(false);
    }
  }

  async function handleCopy() {
    if (!latest?.summary_md) return;
    try {
      await navigator.clipboard.writeText(latest.summary_md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy failed — your browser blocked clipboard access.');
    }
  }

  const hasUrl = !!lead.existing_url?.trim();
  const findings = latest?.findings ?? [];
  const critical = findings.filter((f) => f.severity === 'critical');
  const warn = findings.filter((f) => f.severity === 'warn');
  const info = findings.filter((f) => f.severity === 'info');
  const passing = findings.filter((f) => f.severity === 'pass');

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Website audit</h2>
        <button
          type="button"
          onClick={handleRun}
          disabled={!hasUrl || running}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {running ? 'Auditing…' : latest ? 'Run audit again' : 'Run audit'}
        </button>
      </div>

      {!hasUrl && (
        <div className="rounded-lg border border-border-default bg-bg-primary px-4 py-2.5 text-[13px] text-fg-tertiary">
          Add a current website above to run an audit.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-fg-tertiary">Loading…</p>
      ) : !latest ? (
        <p className="text-[13px] text-fg-tertiary">
          No audit yet. Run one to score this lead&apos;s current website.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Header: status + audited URL + copy */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <StatusBadge status={latest.status} />
              <span className="text-[12px] text-fg-tertiary truncate">{latest.audited_url}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!latest.summary_md}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-[color:var(--accent-teal)]" /> Copied ✓
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy summary
                </>
              )}
            </button>
          </div>

          {latest.status === 'generating' && (
            <p className="text-[13px] text-fg-tertiary">Auditing the site — this takes up to a minute…</p>
          )}
          {latest.status === 'failed' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-fg-secondary">
              Audit could not complete ({latest.generation_error ?? 'unknown'}). Check the URL and run it again.
            </div>
          )}
          {latest.status === 'partial' && (
            <div className="rounded-lg border border-[color:var(--accent-gold)]/30 bg-[color:var(--accent-gold-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
              Narrative generation failed — the scores and findings below are still valid.{' '}
              <button type="button" onClick={handleRun} disabled={running} className="underline hover:no-underline disabled:opacity-50">
                Run audit again
              </button>{' '}
              to retry the write-up.
            </div>
          )}

          {/* Scores */}
          {latest.scores && (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-[28px] font-bold leading-none ${scoreColor(latest.scores.overall)}`}>
                  {latest.scores.overall}
                </span>
                <span className="text-[12px] text-fg-tertiary">/ 100 overall</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORY_ORDER.map((c) => (
                  <div key={c} className="rounded-lg border border-border-default bg-bg-primary px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.04em] text-fg-tertiary">{CATEGORY_LABEL[c]}</div>
                    <div className={`text-[16px] font-bold ${scoreColor(latest.scores!.categories[c])}`}>
                      {latest.scores!.categories[c]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (
            <div className="space-y-3">
              {[
                { label: 'Critical', items: critical },
                { label: 'Warnings', items: warn },
                { label: 'Notes', items: info },
              ]
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <div key={g.label} className="space-y-1.5">
                    <h3 className="text-[12px] font-semibold text-fg-secondary">{g.label}</h3>
                    <ul className="space-y-1.5">
                      {g.items.map((f) => (
                        <li key={f.id} className="flex items-start gap-2 text-[13px]">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(f.severity)}`} />
                          <span className="text-fg-secondary">
                            <span className="text-fg-primary font-medium">{f.title}</span>
                            {f.evidence ? <span className="text-fg-tertiary"> — {f.evidence}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

              {passing.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPassing((v) => !v)}
                    className="inline-flex items-center gap-1 text-[12px] text-fg-tertiary hover:text-fg-secondary"
                  >
                    <ChevronDown size={13} className={showPassing ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    {passing.length} passing check{passing.length > 1 ? 's' : ''}
                  </button>
                  {showPassing && (
                    <ul className="mt-1.5 space-y-1 pl-4">
                      {passing.map((f) => (
                        <li key={f.id} className="text-[12.5px] text-fg-tertiary">✓ {f.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PageSpeed */}
          <div className="space-y-1.5">
            <h3 className="text-[12px] font-semibold text-fg-secondary">PageSpeed (Lighthouse, mobile)</h3>
            {latest.psi ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Performance', v: latest.psi.categories.performance },
                  { label: 'Accessibility', v: latest.psi.categories.accessibility },
                  { label: 'Best practices', v: latest.psi.categories.best_practices },
                  { label: 'SEO', v: latest.psi.categories.seo },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-border-default bg-bg-primary px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.04em] text-fg-tertiary">{m.label}</div>
                    <div className={`text-[15px] font-bold ${m.v === null ? 'text-fg-tertiary' : scoreColor(m.v)}`}>
                      {m.v === null ? 'n/a' : m.v}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-fg-tertiary">PageSpeed unavailable.</p>
            )}
          </div>

          {/* Narrative */}
          {latest.narrative && (
            <div className="space-y-3 rounded-lg border border-border-default bg-bg-primary p-4">
              <p className="text-[14px] font-medium text-fg-primary">{latest.narrative.one_liner}</p>
              {[
                { label: 'Current state', md: latest.narrative.current_state_md },
                { label: 'Opportunities', md: latest.narrative.opportunities_md },
                { label: 'Competitive picture', md: latest.narrative.competitive_md },
                { label: 'Suggested next step', md: latest.narrative.next_steps_md },
              ].map((s) => (
                <div key={s.label} className="space-y-1">
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-fg-tertiary">{s.label}</h4>
                  <div className="prose-audit text-[13px] text-fg-secondary [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1 [&_a]:text-[color:var(--accent-teal)] [&_a]:underline">
                    <CommunityMarkdown body={s.md} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="border-t border-border-default pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] text-fg-tertiary hover:text-fg-secondary"
          >
            <ChevronDown size={13} className={showHistory ? 'rotate-180 transition-transform' : 'transition-transform'} />
            Audit history ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-fg-tertiary">
                    {new Date(h.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    {h.overall !== null && <span className="text-fg-secondary">{h.overall}/100</span>}
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
