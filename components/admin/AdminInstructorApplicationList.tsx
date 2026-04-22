'use client';

import { useState } from 'react';
import Link from 'next/link';
import type {
  InstructorApplicationWithPartner,
  InstructorApplicationStatus,
} from '@/lib/instructor-applications/types';

type Props = {
  applications: InstructorApplicationWithPartner[];
};

const statusFilters: (InstructorApplicationStatus | 'all')[] = [
  'all',
  'pending',
  'approved',
  'rejected',
  'withdrawn',
];

const statusStyles: Record<InstructorApplicationStatus, string> = {
  pending: 'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
  approved: 'bg-green-500/15 text-green-500 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
  withdrawn: 'bg-fg-tertiary/15 text-fg-tertiary border-fg-tertiary/30',
};

export function AdminInstructorApplicationList({ applications }: Props) {
  const [filter, setFilter] = useState<InstructorApplicationStatus | 'all'>('all');

  const filtered =
    filter === 'all'
      ? applications
      : applications.filter((a) => a.status === filter);

  const counts: Record<InstructorApplicationStatus | 'all', number> = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    withdrawn: applications.filter((a) => a.status === 'withdrawn').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto">
        {statusFilters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap ${
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
        <p className="text-fg-tertiary text-center py-12">No applications found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => (
            <Link
              key={app.id}
              href={`/admin/instructor-applications/${app.id}`}
              className="block border border-border-default rounded-lg p-4 hover:border-accent-teal/40 hover:bg-bg-tertiary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-fg-primary">
                      {app.applicant_full_name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium ${statusStyles[app.status]}`}
                    >
                      {app.status}
                    </span>
                    {app.partner_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-teal/10 text-accent-teal uppercase tracking-wider font-medium">
                        via {app.partner_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fg-tertiary truncate">
                    {app.applicant_email}
                    {app.proposed_topic && ` · ${app.proposed_topic}`}
                  </p>
                  <p className="text-xs text-fg-tertiary mt-1">
                    {new Date(app.submitted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="text-fg-tertiary text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
