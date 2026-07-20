'use client';

import { useState } from 'react';
import { StudioLeadRow } from './StudioLeadRow';
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

const HEADERS = ['Name', 'Status', 'Company', 'Email', 'Source', 'Created'];

const chipBase =
  'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold capitalize border transition-all whitespace-nowrap';
const chipActive = 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]';
const chipInactive =
  'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';

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
    <div className="space-y-8">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto">
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
          <p className="text-sm text-fg-tertiary">No studio leads found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-bg-secondary border border-border-default rounded-[14px] shadow-[var(--shadow-md)]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-default bg-bg-tertiary">
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11.5px] font-bold text-fg-tertiary uppercase tracking-[0.06em]"
                  >
                    {h}
                  </th>
                ))}
                <th className="w-8" aria-hidden />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {filtered.map((lead) => (
                <StudioLeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
