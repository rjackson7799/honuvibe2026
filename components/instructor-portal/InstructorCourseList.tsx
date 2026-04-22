'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { InstructorCourseRow } from '@/lib/instructor-portal/types';

type Props = {
  courses: InstructorCourseRow[];
};

const filters = [
  { key: 'all', label: 'All' },
  { key: 'proposal', label: 'Proposals' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'draft', label: 'Drafts' },
  { key: 'published', label: 'Live' },
] as const;

const statusStyles: Record<string, string> = {
  proposal: 'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
  draft: 'bg-bg-tertiary text-fg-tertiary border-border-default',
  published: 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
  'in-progress': 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
  completed: 'bg-bg-tertiary text-fg-secondary border-border-default',
  archived: 'bg-bg-tertiary text-fg-tertiary border-border-default',
};

function statusBucket(status: string): string {
  if (status === 'published' || status === 'in-progress') return 'published';
  return status;
}

export function InstructorCourseList({ courses }: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('all');

  const filtered =
    filter === 'all' ? courses : courses.filter((c) => statusBucket(c.status) === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filter === f.key
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary p-8 text-center">
          <p className="text-sm text-fg-tertiary">
            {filter === 'all'
              ? 'You have no courses yet. Propose your first course to get started.'
              : 'Nothing in this view.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const editable = c.status === 'proposal';
            const href = editable
              ? `/instructor/courses/${c.id}/edit`
              : c.is_published
                ? `/learn/${c.slug}`
                : `/instructor/courses/${c.id}/edit`;
            return (
              <Link
                key={c.id}
                href={href}
                className="block border border-border-default rounded-lg p-4 hover:border-accent-teal/40 hover:bg-bg-tertiary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-fg-primary">{c.title_en}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium ${
                          statusStyles[c.status] ?? 'bg-bg-tertiary text-fg-tertiary border-border-default'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    {c.description_en && (
                      <p className="text-xs text-fg-tertiary line-clamp-2">{c.description_en}</p>
                    )}
                    {c.status === 'rejected' && c.proposal_review_notes && (
                      <p className="mt-2 rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-xs text-red-300">
                        <span className="font-semibold">Reviewer notes:</span>{' '}
                        {c.proposal_review_notes}
                      </p>
                    )}
                  </div>
                  <span className="text-fg-tertiary text-sm shrink-0">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
