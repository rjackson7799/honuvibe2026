'use client';

import { useState } from 'react';
import { PartnershipInquiryCard } from './PartnershipInquiryCard';
import type {
  PartnershipInquiry,
  PartnershipInquiryStatus,
} from '@/lib/admin/types';

type Props = {
  inquiries: PartnershipInquiry[];
};

const statusFilters: (PartnershipInquiryStatus | 'all')[] = [
  'all',
  'received',
  'reviewing',
  'responded',
  'archived',
];

export function AdminPartnershipInquiriesList({ inquiries }: Props) {
  const [filter, setFilter] = useState<PartnershipInquiryStatus | 'all'>('all');

  const filtered =
    filter === 'all'
      ? inquiries
      : inquiries.filter((i) => i.status === filter);

  const counts = {
    all: inquiries.length,
    received: inquiries.filter((i) => i.status === 'received').length,
    reviewing: inquiries.filter((i) => i.status === 'reviewing').length,
    responded: inquiries.filter((i) => i.status === 'responded').length,
    archived: inquiries.filter((i) => i.status === 'archived').length,
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
          No partnership inquiries found.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((inquiry) => (
            <PartnershipInquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}
