'use client';

import { useState } from 'react';
import { StudioLeadCard } from './StudioLeadCard';
import type { StudioLead, StudioLeadStatus } from '@/lib/admin/types';

type Props = {
  leads: StudioLead[];
};

const statusFilters: (StudioLeadStatus | 'all')[] = [
  'all',
  'new',
  'qualified',
  'proposal',
  'won',
  'lost',
];

export function AdminStudioLeadsList({ leads }: Props) {
  const [filter, setFilter] = useState<StudioLeadStatus | 'all'>('all');

  const filtered =
    filter === 'all' ? leads : leads.filter((l) => l.status === filter);

  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    proposal: leads.filter((l) => l.status === 'proposal').length,
    won: leads.filter((l) => l.status === 'won').length,
    lost: leads.filter((l) => l.status === 'lost').length,
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
        <p className="text-fg-tertiary text-center py-8">
          No studio leads found.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <StudioLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
