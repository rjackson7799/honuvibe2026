// Small date helpers for the engagement admin surfaces ("days in stage",
// "Sent · 3d ago", "Started Mar 14"). Pure; `now` is injectable for tests.
//
// Formatting is pinned to one time zone: these render inside client
// components that are ALSO server-rendered, and Vercel renders in UTC while
// Ryan reads in HST — an unpinned toLocale*String would produce different text
// on each side and a hydration mismatch on every row. The admin is a
// single-operator surface, so the operator's zone is the right constant.

export const ADMIN_TIME_ZONE = 'Pacific/Honolulu';

const DAY_MS = 86_400_000;

export function daysSince(iso: string, now: number = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

/** "Mar 14" — same format StudioLeadRow uses for created_at. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: ADMIN_TIME_ZONE,
  });
}

/** "Mar 14, 3:05 PM" — timeline rows. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ADMIN_TIME_ZONE,
  });
}

/** "today" · "1d ago" · "12d ago" · "3mo ago"; "—" for null. */
export function formatRelativeDays(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const d = daysSince(iso, now);
  if (d === 0) return 'today';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
