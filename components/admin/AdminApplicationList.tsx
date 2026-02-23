'use client';

import { useState } from 'react';
import { ApplicationCard } from './ApplicationCard';
import type { Application, ApplicationStatus } from '@/lib/admin/types';

type AdminApplicationListProps = {
  applications: Application[];
};

const statusFilters: (ApplicationStatus | 'all')[] = ['all', 'received', 'reviewing', 'responded', 'archived'];

export function AdminApplicationList({ applications }: AdminApplicationListProps) {
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');

  const filtered = filter === 'all'
    ? applications
    : applications.filter((a) => a.status === filter);

  const counts = {
    all: applications.length,
    received: applications.filter((a) => a.status === 'received').length,
    reviewing: applications.filter((a) => a.status === 'reviewing').length,
    responded: applications.filter((a) => a.status === 'responded').length,
    archived: applications.filter((a) => a.status === 'archived').length,
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
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

      {/* Applications */}
      {filtered.length === 0 ? (
        <p className="text-fg-tertiary text-center py-8">No applications found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
