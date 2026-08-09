'use client';

// Blue Filler — the ranked idea list. Filtering is client-side over the rows the
// server already ranked (composite DESC, created_at DESC, id DESC) and capped at
// IDEA_LIST_CAP; the cap is surfaced rather than hidden, so a full list never
// silently looks complete.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { getIndustry } from '@/lib/blue-filler/industry-map';
import { IDEA_LIST_CAP } from '@/lib/blue-filler/types';
import type { BlueFillerIdea, Grade, IdeaStatus } from '@/lib/blue-filler/types';

type StatusFilter = 'all' | IdeaStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'shortlist', label: 'Shortlist' },
  { value: 'archived', label: 'Archived' },
];

function gradeColor(grade: Grade): string {
  if (grade === 'A') return 'text-[color:var(--accent-teal)]';
  if (grade === 'B') return 'text-[color:var(--accent-gold)]';
  if (grade === 'C') return 'text-fg-secondary';
  return 'text-fg-tertiary';
}

export function BlueFillerIdeasTable({ ideas }: { ideas: BlueFillerIdea[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const visible = useMemo(
    () => (statusFilter === 'all' ? ideas : ideas.filter((idea) => idea.status === statusFilter)),
    [ideas, statusFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={statusFilter === filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === filter.value
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-fg-tertiary text-center py-8">
          No ideas yet. Generate one above to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((idea) => {
            const industry = getIndustry(idea.industry_key);
            return (
              <li key={idea.id}>
                <Link
                  href={`/admin/blue-filler/${idea.id}`}
                  className="flex items-start gap-4 rounded-xl border border-border-default bg-bg-secondary p-4 hover:border-border-hover transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-fg-primary">{idea.title}</span>
                      <StatusBadge status={idea.status} />
                      {idea.verdict && <StatusBadge status={idea.verdict} />}
                    </div>
                    <p className="text-[13px] text-fg-secondary line-clamp-2">{idea.one_liner}</p>
                    <div className="flex items-center gap-3 text-[12px] text-fg-tertiary flex-wrap">
                      <span>
                        {industry?.label ?? idea.industry_key} · {idea.origin}
                      </span>
                      {idea.kill_memo && (
                        <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-fg-tertiary text-[11px]">
                          kill memo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[22px] font-bold leading-none ${gradeColor(idea.grade)}`}>
                      {idea.composite}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-fg-tertiary text-[11px] font-semibold">
                      {idea.grade}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {ideas.length >= IDEA_LIST_CAP && (
        <p className="text-[11px] text-fg-tertiary">
          Showing the top {IDEA_LIST_CAP} ideas by score. Older lower-scoring ideas are not listed.
        </p>
      )}
    </div>
  );
}
