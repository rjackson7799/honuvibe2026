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
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={statusFilter === filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === filter.value
                ? 'border-[color:var(--border-accent)] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]'
                : 'border-border-primary text-fg-secondary hover:border-border-hover'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-fg-tertiary">No ideas yet.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((idea) => {
            const industry = getIndustry(idea.industry_key);
            return (
              <li key={idea.id}>
                <Link
                  href={`/admin/blue-filler/${idea.id}`}
                  className="flex items-start gap-4 rounded-xl border border-border-primary bg-bg-secondary p-4 hover:border-border-hover transition-colors"
                >
                  <div className="shrink-0 text-center w-12">
                    <div className={`text-2xl font-bold leading-none ${gradeColor(idea.grade)}`}>
                      {idea.grade}
                    </div>
                    <div className="mt-1 text-[11px] text-fg-muted">{idea.composite}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-fg-primary">{idea.title}</span>
                      <StatusBadge status={idea.status} />
                      {idea.verdict && <StatusBadge status={idea.verdict} />}
                    </div>
                    <p className="mt-1 text-sm text-fg-secondary line-clamp-2">{idea.one_liner}</p>
                    <p className="mt-1.5 text-[11px] text-fg-muted">
                      {industry?.label ?? idea.industry_key} · {idea.origin}
                      {idea.kill_memo ? ' · kill memo' : ''}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {ideas.length >= IDEA_LIST_CAP && (
        <p className="text-[11px] text-fg-muted">
          Showing the top {IDEA_LIST_CAP} ideas by score. Older lower-scoring ideas are not listed.
        </p>
      )}
    </div>
  );
}
