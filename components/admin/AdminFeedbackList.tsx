'use client';

import { useState } from 'react';
import type { Feedback, FeedbackStatus } from '@/lib/admin/types';

type Props = {
  feedback: Feedback[];
};

const statusFilters: (FeedbackStatus | 'all')[] = [
  'all',
  'new',
  'reviewing',
  'resolved',
  'archived',
];

const categoryLabels: Record<Feedback['category'], string> = {
  general: 'General',
  idea: 'Idea',
  problem: 'Problem',
};

export function AdminFeedbackList({ feedback }: Props) {
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');

  const filtered = filter === 'all' ? feedback : feedback.filter((f) => f.status === filter);

  const counts = {
    all: feedback.length,
    new: feedback.filter((f) => f.status === 'new').length,
    reviewing: feedback.filter((f) => f.status === 'reviewing').length,
    resolved: feedback.filter((f) => f.status === 'resolved').length,
    archived: feedback.filter((f) => f.status === 'archived').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto">
        {statusFilters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {s === 'all' ? `All (${counts.all})` : `${s} (${counts[s]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-fg-tertiary text-center py-8">No feedback found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ item }: { item: Feedback }) {
  const submitter = item.users?.full_name || item.users?.email || 'Unknown member';

  return (
    <div className="border border-border-default rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-full bg-accent-teal/10 text-accent-teal text-[11px] font-semibold px-2 py-0.5">
          {categoryLabels[item.category]}
        </span>
        <span className="inline-flex items-center rounded-full bg-bg-tertiary text-fg-tertiary text-[11px] font-medium px-2 py-0.5 capitalize">
          {item.status}
        </span>
      </div>

      <p className="text-sm text-fg-secondary whitespace-pre-wrap">{item.message}</p>

      <div className="text-xs text-fg-tertiary">
        {submitter}
        {item.users?.email && item.users.full_name ? ` · ${item.users.email}` : ''}
        {' · '}
        {new Date(item.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
        {item.page_path ? ` · ${item.page_path}` : ''}
      </div>
    </div>
  );
}
