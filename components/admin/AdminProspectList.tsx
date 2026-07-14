'use client';

// Prospect Finder panel (Studio, phase 4). Search POSTs to the 202 + after()
// route, then polls the list GET every ~5s while the UNFILTERED scoringCount is
// > 0 — never the visible rows, so polling survives filters that hide 'scoring'
// rows and rows that fall outside the top-200. Same aliveRef/pollRef guards as
// StudioLeadAuditPanel. Convert navigates straight into the Phase 1 lead
// workspace, where Run audit is one click away — the flywheel.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ExternalLink, Loader2, Search, Star } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { Prospect, ProspectStatus } from '@/lib/admin/types';

const POLL_MS = 5000;
const BREAKDOWN_CHIP_CAP = 4;

type StatusFilter = 'active' | ProspectStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'scored', label: 'Scored' },
  { value: 'no_website', label: 'No Website' },
  { value: 'score_failed', label: 'Score Failed' },
  { value: 'converted', label: 'Converted' },
  { value: 'dismissed', label: 'Dismissed' },
];

function scoreColor(n: number): string {
  if (n >= 80) return 'text-[color:var(--accent-teal)]';
  if (n >= 50) return 'text-[color:var(--accent-gold)]';
  return 'text-fg-tertiary';
}

// websiteUri is third-party data and is stored RAW when normalization failed
// (the scorer re-checks it) — never let a non-http(s) value reach an href.
function safeHref(website: string | null): string | null {
  if (!website) return null;
  try {
    const u = new URL(website);
    return u.protocol === 'http:' || u.protocol === 'https:' ? website : null;
  } catch {
    return null;
  }
}

type Props = {
  initialProspects: Prospect[];
  initialScoringCount: number;
};

export function AdminProspectList({ initialProspects, initialScoringCount }: Props) {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [scoringCount, setScoringCount] = useState(initialScoringCount);
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);
  // The poll callback reads the CURRENT filters through refs so a filter change
  // never needs to restart the interval.
  const filterRef = useRef<{ status: StatusFilter; q: string }>({ status: 'active', q: '' });
  filterRef.current = { status: statusFilter, q };

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Resolves the unfiltered scoringCount, 'http-error' on a non-ok response
  // (definitive — e.g. an expired session), or null on a transient network blip.
  async function fetchList(
    status: StatusFilter,
    search: string,
  ): Promise<number | 'http-error' | null> {
    const params = new URLSearchParams();
    if (status !== 'active') params.set('status', status);
    if (search.trim()) params.set('q', search.trim().slice(0, 80));
    const qs = params.toString();
    try {
      const res = await fetch(`/api/admin/prospects${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      if (!aliveRef.current) return null;
      if (!res.ok) {
        setError(data.error ?? 'Failed to load prospects.');
        return 'http-error';
      }
      setProspects(data.prospects ?? []);
      setScoringCount(data.scoringCount ?? 0);
      return (data.scoringCount ?? 0) as number;
    } catch {
      if (aliveRef.current) setError('Failed to load prospects.');
      return null;
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const { status, q: search } = filterRef.current;
      const count = await fetchList(status, search);
      // Stop on a definitive zero or an HTTP error (same rule as the audit
      // panel); a transient network blip keeps polling.
      if (count === 0 || count === 'http-error') stopPolling();
    }, POLL_MS);
  }

  useEffect(() => {
    aliveRef.current = true;
    if (initialScoringCount > 0) startPolling();
    return () => {
      aliveRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch on filter changes (small debounce for the text filter). Polling is
  // untouched — it reads scoringCount, not the rows.
  const initialRender = useRef(true);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    const t = setTimeout(() => void fetchList(statusFilter, q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, q]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!industry.trim() || !location.trim() || searching) return;
    setError('');
    setNotice('');
    setSearching(true);
    try {
      const res = await fetch('/api/admin/prospects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: industry.trim(), location: location.trim() }),
      });
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? 'The search failed.');
        return;
      }
      if (data.found === 0) {
        setNotice('No businesses found for that search.');
        return;
      }
      setNotice(`Found ${data.found} businesses — scoring ${data.scoring} sites…`);
      await fetchList(statusFilter, q);
      if ((data.scoring ?? 0) > 0) startPolling();
    } catch {
      if (aliveRef.current) setError('The search failed.');
    } finally {
      if (aliveRef.current) setSearching(false);
    }
  }

  async function handleConvert(id: string) {
    setError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/convert`, { method: 'POST' });
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? 'Failed to convert the prospect.');
        setBusyId(null);
        return;
      }
      router.push(`/admin/studio/leads/${data.leadId}`);
    } catch {
      if (aliveRef.current) {
        setError('Failed to convert the prospect.');
        setBusyId(null);
      }
    }
  }

  async function handlePatch(id: string, action: 'dismiss' | 'restore') {
    setError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!aliveRef.current) return;
      if (!res.ok) {
        setError(data.error ?? `Failed to ${action} the prospect.`);
        return;
      }
      await fetchList(statusFilter, q);
    } catch {
      if (aliveRef.current) setError(`Failed to ${action} the prospect.`);
    } finally {
      if (aliveRef.current) setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-border-default bg-bg-secondary p-4 flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          placeholder="Industry — e.g. plumber"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          maxLength={100}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
        <input
          type="text"
          placeholder="Location — e.g. Honolulu, HI"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
        <button
          type="submit"
          disabled={searching || !industry.trim() || !location.trim()}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
        >
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}
      {scoringCount > 0 ? (
        <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-[13px] text-fg-secondary inline-flex items-center gap-2">
          <Loader2 size={13} className="animate-spin text-[color:var(--accent-teal)]" />
          Scoring {scoringCount} site{scoringCount > 1 ? 's' : ''}…
        </div>
      ) : notice ? (
        <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-[13px] text-fg-tertiary">
          {notice}
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s.value
                  ? 'bg-accent-teal/10 text-accent-teal'
                  : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter by name, industry, location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={80}
          className="sm:ml-auto sm:w-64 px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
      </div>

      {/* Ranked list */}
      {prospects.length === 0 ? (
        <p className="text-fg-tertiary text-center py-8">
          No prospects yet. Search an industry and location to find some.
        </p>
      ) : (
        <ul className="space-y-3">
          {prospects.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-border-default bg-bg-secondary p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold text-fg-primary">{p.name}</span>
                  {safeHref(p.website) && (
                    <a
                      href={safeHref(p.website)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${p.name}'s website`}
                      className="text-fg-tertiary hover:text-[color:var(--accent-teal)] transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-3 text-[12px] text-fg-tertiary flex-wrap">
                  <span>
                    {p.industry} · {p.location}
                  </span>
                  {p.rating !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Star size={11} className="text-[color:var(--accent-gold)]" />
                      {p.rating}
                      {p.review_count !== null && ` (${p.review_count})`}
                    </span>
                  )}
                  {p.phone && <span>{p.phone}</span>}
                </div>
                {(p.score_breakdown?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.score_breakdown!.slice(0, BREAKDOWN_CHIP_CAP).map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-0.5 rounded-full bg-bg-tertiary text-fg-tertiary text-[11px]"
                      >
                        {b.label}
                      </span>
                    ))}
                    {p.score_breakdown!.length > BREAKDOWN_CHIP_CAP && (
                      <span className="text-[11px] text-fg-tertiary">
                        +{p.score_breakdown!.length - BREAKDOWN_CHIP_CAP} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {p.score !== null && (
                  <span className={`text-[22px] font-bold leading-none ${scoreColor(p.score)}`}>
                    {p.score}
                  </span>
                )}
                {p.status === 'converted' && p.converted_lead_id ? (
                  <a
                    href={`/admin/studio/leads/${p.converted_lead_id}`}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-[color:var(--accent-teal)] hover:underline"
                  >
                    Open lead <ArrowRight size={13} />
                  </a>
                ) : (
                  <>
                    {p.status !== 'dismissed' && (
                      <button
                        type="button"
                        onClick={() => handleConvert(p.id)}
                        disabled={busyId === p.id}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold disabled:opacity-50 transition-colors"
                      >
                        {busyId === p.id && <Loader2 size={12} className="animate-spin" />}
                        Convert
                      </button>
                    )}
                    {/* Converted is final — never dismissible, even when the lead
                        was later deleted (converted_lead_id null). */}
                    {p.status !== 'converted' && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePatch(p.id, p.status === 'dismissed' ? 'restore' : 'dismiss')
                        }
                        disabled={busyId === p.id}
                        className="inline-flex items-center h-8 px-3 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
                      >
                        {p.status === 'dismissed' ? 'Restore' : 'Dismiss'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
