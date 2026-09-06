'use client';

// Compact version history: v2 · Sent Mar 14 · viewed 2× · $875.00 /
// v1 · Superseded / v3 · Voided — "wrong tier". Each issued row has
// Download PDF (the archive).

import { StatusBadge } from './StatusBadge';
import { formatMinorUnits, formatShortDate } from '@/lib/studio/engagement/format';
import type { EngagementProposal } from '@/lib/admin/types';

export function ProposalVersionList({ proposals, engagementId }: { proposals: EngagementProposal[]; engagementId: string }) {
  if (proposals.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {proposals.map((p) => {
        const bits: string[] = [`v${p.version}`];
        if (p.status === 'sent' || p.status === 'accepted') bits.push(`Issued ${p.sent_at ? formatShortDate(p.sent_at) : '—'}`);
        if (p.status === 'accepted' && p.accepted_at) bits.push(`Accepted ${formatShortDate(p.accepted_at)}`);
        if (p.open_count > 0) bits.push(`viewed ${p.open_count}×`);
        if (p.status === 'voided' && p.void_reason) bits.push(`— "${p.void_reason}"`);
        bits.push(formatMinorUnits(p.total_build, p.currency));
        return (
          <li key={p.id} className="flex items-center justify-between gap-3 text-[12.5px] flex-wrap">
            <span className="text-fg-secondary">{bits.join(' · ')}</span>
            <span className="flex items-center gap-2">
              {p.issued_pdf_path && (
                <a
                  href={`/api/admin/engagements/${engagementId}/proposal/${p.id}/pdf`}
                  className="inline-flex items-center min-h-[44px] text-[12px] font-semibold text-[color:var(--accent-teal)] hover:underline"
                >
                  Download PDF
                </a>
              )}
              <StatusBadge status={p.status} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
