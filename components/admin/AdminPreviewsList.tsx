import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminPreviewSummary } from '@/lib/previews/admin-queries';

// Client-preview list — plain (server-renderable) markup; no client state.
// The two helpers below are shared with AdminPreviewFeedback and the detail page.

/** Stable, timezone-independent `YYYY-MM-DD HH:mm UTC` (no hydration drift). */
export function formatPreviewDate(iso: string): string {
  return `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** Expired when an expiry is set and already in the past. */
export function isPreviewExpired(expiresAt: string | null, now: number): boolean {
  return expiresAt !== null && new Date(expiresAt).getTime() < now;
}

export function PreviewLiveChip({ expired }: { expired: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold',
        expired ? 'bg-bg-tertiary text-fg-tertiary' : 'bg-accent-teal/10 text-accent-teal',
      )}
    >
      {expired ? 'Expired' : 'Live'}
    </span>
  );
}

type Props = {
  previews: AdminPreviewSummary[];
  /** Render time (ms) for the Live / Expired chip; passed in to keep rendering pure. */
  now: number;
  /** True when the list hit the query cap. */
  truncated: boolean;
};

export function AdminPreviewsList({ previews, now, truncated }: Props) {
  if (previews.length === 0) {
    return (
      <div className="py-10 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
        <p className="text-sm text-fg-tertiary">No client previews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="bg-bg-secondary border border-border-default rounded-[14px] shadow-[var(--shadow-md)] divide-y divide-border-secondary overflow-hidden">
        {previews.map((p) => {
          const expired = isPreviewExpired(p.expiresAt, now);
          return (
            <li key={p.id}>
              <Link
                href={`/admin/studio/previews/${p.id}`}
                className="flex items-center gap-4 min-h-[44px] px-4 py-3.5 hover:bg-bg-tertiary transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-fg-primary truncate">
                      {p.title || p.slug}
                    </span>
                    <PreviewLiveChip expired={expired} />
                  </div>
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[12.5px] text-fg-tertiary">
                    <span>
                      {p.accessCount} {p.accessCount === 1 ? 'visit' : 'visits'}
                    </span>
                    <span>
                      {p.lastAccessedAt
                        ? `Last visit ${formatPreviewDate(p.lastAccessedAt)}`
                        : 'Not visited yet'}
                    </span>
                    <span>{p.feedbackEnabled ? 'Feedback on' : 'Feedback off'}</span>
                    {p.counts.total > 0 && (
                      <span className="font-semibold text-fg-secondary">
                        {p.counts.new} new · {p.counts.open} open
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-fg-tertiary" />
              </Link>
            </li>
          );
        })}
      </ul>
      {truncated && (
        <p className="text-[12.5px] text-fg-tertiary">Showing the newest 200 previews.</p>
      )}
    </div>
  );
}
