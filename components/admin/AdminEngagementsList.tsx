'use client';

// Engagements list — mirrors AdminStudioLeadsList 1:1 (same chip constants,
// same table chrome). Five columns, not six: Email/Source are lead-acquisition
// facts that belong on the lead page.

import { useState } from 'react';
import Link from 'next/link';
import { EngagementRow } from './EngagementRow';
import { ENGAGEMENT_STAGES, STAGE_LABELS, type EngagementStage } from '@/lib/studio/engagement/stages';
import type { EngagementListItem } from '@/lib/admin/types';

type Props = {
  engagements: EngagementListItem[];
};

const stageFilters: (EngagementStage | 'all')[] = ['all', ...ENGAGEMENT_STAGES];

const HEADERS = ['Client', 'Stage', 'Discovery', 'Last activity', 'Started'];

const chipBase =
  'px-3.5 py-1.5 min-h-[44px] rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap';
const chipActive = 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]';
const chipInactive =
  'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';

export function AdminEngagementsList({ engagements }: Props) {
  const [filter, setFilter] = useState<EngagementStage | 'all'>('all');

  const filtered =
    filter === 'all' ? engagements : engagements.filter((e) => e.stage === filter);

  const counts: Record<EngagementStage | 'all', number> = {
    all: engagements.length,
    discovery: 0,
    proposal: 0,
    build: 0,
    launch: 0,
    care: 0,
    lost: 0,
    closed: 0,
  };
  for (const e of engagements) counts[e.stage] += 1;

  return (
    <div className="space-y-8">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto">
        {stageFilters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`${chipBase} ${filter === s ? chipActive : chipInactive}`}
          >
            {s === 'all' ? `All (${counts.all})` : `${STAGE_LABELS[s]} (${counts[s]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center space-y-2">
          <p className="text-sm text-fg-tertiary">
            {engagements.length === 0 ? 'No engagements yet.' : 'No engagements at this stage.'}
          </p>
          {engagements.length === 0 && (
            <p className="text-[13px] text-fg-tertiary">
              Mark a lead Qualified, save, then click Start engagement in the{' '}
              <Link href="/admin/studio/leads" className="font-semibold text-[color:var(--accent-teal)] hover:underline">
                lead workspace
              </Link>
              .
            </p>
          )}
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
              {filtered.map((e) => (
                <EngagementRow key={e.id} engagement={e} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
