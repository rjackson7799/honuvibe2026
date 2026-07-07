'use client';

// Admin Workbench scenario list — filterable/searchable table with per-row
// quick actions (mirrors AdminVaultList's filter+search pattern; keeps a
// hand-rolled table because rows mix a title link with action buttons).

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import {
  duplicateScenario,
  publishScenario,
  setScenarioFeatured,
  unpublishScenario,
} from '@/lib/workbench/actions';
import {
  WORKBENCH_DIFFICULTIES,
  WORKBENCH_DOMAINS,
} from '@/lib/workbench/types';
import type { AdminWorkbenchScenarioListItem } from '@/lib/workbench/queries';

const DOMAIN_STYLE: Record<string, string> = {
  marketing: 'bg-accent-teal/10 text-accent-teal',
  operations: 'bg-accent-gold/10 text-accent-gold',
  communication: 'bg-bg-tertiary text-fg-secondary',
};

const STATUS_FILTERS = ['all', 'published', 'draft', 'featured'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const actionBtn =
  'text-[12px] font-medium text-fg-tertiary hover:text-accent-teal disabled:opacity-50 transition-colors';

export function AdminWorkbenchScenarioList({
  scenarios,
}: {
  scenarios: AdminWorkbenchScenarioListItem[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();

  const searchLower = search.toLowerCase();
  const filtered = scenarios
    .filter((s) => {
      if (statusFilter === 'published') return s.is_published;
      if (statusFilter === 'draft') return !s.is_published;
      if (statusFilter === 'featured') return s.is_featured;
      return true;
    })
    .filter((s) => domainFilter === 'all' || s.domain === domainFilter)
    .filter((s) => difficultyFilter === 'all' || s.difficulty === difficultyFilter)
    .filter((s) => {
      if (!searchLower) return true;
      return (
        s.title_en.toLowerCase().includes(searchLower) ||
        (s.title_jp?.toLowerCase().includes(searchLower) ?? false) ||
        s.slug.toLowerCase().includes(searchLower)
      );
    });

  function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setRowError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setRowError({
          id,
          message: err instanceof Error ? err.message : 'Action failed',
        });
      } finally {
        setBusyId(null);
      }
    });
  }

  if (scenarios.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm py-8 text-center border border-dashed border-border-default rounded-xl">
        No scenarios yet. Create your first one.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by title or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-secondary capitalize focus:outline-none focus:border-accent-teal cursor-pointer"
        >
          <option value="all">All domains</option>
          {WORKBENCH_DOMAINS.map((d) => (
            <option key={d} value={d} className="capitalize">
              {d}
            </option>
          ))}
        </select>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-secondary capitalize focus:outline-none focus:border-accent-teal cursor-pointer"
        >
          <option value="all">All levels</option>
          {WORKBENCH_DIFFICULTIES.map((d) => (
            <option key={d} value={d} className="capitalize">
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {s === 'all' ? `All (${scenarios.length})` : s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border-default overflow-x-auto bg-bg-secondary">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-tertiary text-[12px] uppercase tracking-[0.04em]">
              <th className="px-4 py-3 font-semibold">Scenario</th>
              <th className="px-4 py-3 font-semibold">Domain</th>
              <th className="px-4 py-3 font-semibold">Difficulty</th>
              <th className="px-4 py-3 font-semibold">Dimensions</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Attempts</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr className="border-t border-border-default">
                <td colSpan={7} className="px-4 py-8 text-center text-fg-tertiary">
                  No scenarios match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const busy = busyId === s.id;
              return (
                <tr
                  key={s.id}
                  className="border-t border-border-default hover:bg-bg-tertiary transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/workbench/${s.id}`}
                      className="text-fg-primary font-medium hover:text-accent-teal"
                    >
                      {s.title_en || 'Untitled scenario'}
                    </Link>
                    <span className="block text-[12px] text-fg-tertiary font-mono">
                      {s.slug}
                    </span>
                    {rowError?.id === s.id && (
                      <span className="block text-[12px] text-[color:var(--accent-coral)] mt-1">
                        {rowError.message}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-medium ${
                        DOMAIN_STYLE[s.domain] ?? 'bg-bg-tertiary text-fg-tertiary'
                      }`}
                    >
                      {s.domain}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-secondary capitalize">{s.difficulty}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap max-w-[220px]">
                      {s.applicable_dimensions.map((d) => (
                        <span
                          key={d}
                          className="px-1.5 py-0.5 rounded-full text-[11px] font-medium capitalize bg-bg-tertiary text-fg-secondary"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <StatusBadge status={s.is_published ? 'published' : 'draft'} />
                      {s.is_featured && <StatusBadge status="featured" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                    {s.attempt_count}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {busy ? (
                      <Loader2 size={14} className="inline animate-spin text-fg-tertiary" />
                    ) : (
                      <span className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          className={actionBtn}
                          disabled={busyId !== null}
                          onClick={() =>
                            runAction(s.id, () =>
                              s.is_published
                                ? unpublishScenario(s.id)
                                : publishScenario(s.id),
                            )
                          }
                        >
                          {s.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          className={actionBtn}
                          disabled={busyId !== null}
                          onClick={() =>
                            runAction(s.id, () =>
                              setScenarioFeatured(s.id, !s.is_featured),
                            )
                          }
                        >
                          {s.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button
                          type="button"
                          className={actionBtn}
                          disabled={busyId !== null}
                          onClick={() =>
                            runAction(s.id, async () => {
                              const copy = await duplicateScenario(s.id);
                              router.push(`/admin/workbench/${copy.id}`);
                            })
                          }
                        >
                          Duplicate
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
