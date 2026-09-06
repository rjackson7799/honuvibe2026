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

/**
 * Money in integer minor units (USD cents / JPY yen) → "$875.00" / "¥250,000".
 * ONE formatter for the panel, the page, the PDF and the emails. JPY is
 * zero-decimal: yen are stored and printed as whole units, never divided.
 * The formatting locale defaults to en-US on purpose — `ja-JP` renders the
 * full-width ￥, and the documents use the plain ¥ in both languages.
 */
export function formatMinorUnits(amount: number, currency: 'USD' | 'JPY', locale = 'en-US'): string {
  const value = currency === 'JPY' ? amount : amount / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}
