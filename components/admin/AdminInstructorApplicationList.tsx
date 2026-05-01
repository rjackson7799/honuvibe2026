'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BadgePill } from '@/components/ui/badge-pill';
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

const statusVariant: Record<InstructorApplicationStatus, 'coral' | 'teal' | 'gray'> = {
  pending: 'coral',
  approved: 'teal',
  rejected: 'gray',
  withdrawn: 'gray',
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

  const chipBase =
    'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap capitalize';
  const chipActive = 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]';
  const chipInactive =
    'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`${chipBase} ${filter === s ? chipActive : chipInactive}`}
          >
            {s === 'all' ? `All (${counts.all})` : `${s} (${counts[s]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <p className="text-sm text-fg-tertiary">No applications found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => (
            <Link
              key={app.id}
              href={`/admin/instructor-applications/${app.id}`}
              className="group block bg-bg-secondary border border-border-default rounded-[14px] p-4 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:border-[color:var(--accent-teal)]/35 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[14px] font-semibold text-fg-primary">
                      {app.applicant_full_name}
                    </span>
                    <BadgePill variant={statusVariant[app.status]} size="xs">
                      {app.status}
                    </BadgePill>
                    {app.partner_name && (
                      <BadgePill variant="teal" size="xs">via {app.partner_name}</BadgePill>
                    )}
                  </div>
                  <p className="text-[12px] text-fg-tertiary truncate">
                    {app.applicant_email}
                    {app.proposed_topic && ` · ${app.proposed_topic}`}
                  </p>
                  <p className="text-[11.5px] text-fg-tertiary mt-1 font-medium">
                    {new Date(app.submitted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-fg-tertiary group-hover:text-[color:var(--accent-teal)] shrink-0 mt-1 transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
