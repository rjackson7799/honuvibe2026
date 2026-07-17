import { HAWAII_TZ } from '@/lib/dates';

/**
 * Which band an action item falls into. The order of this array IS the sort
 * order — an overdue item must never sit below a dateless one.
 */
export const DUE_BUCKETS = ['overdue', 'due_soon', 'future', 'undated'] as const;
export type DueBucket = (typeof DUE_BUCKETS)[number];

export type DueInfo = {
  bucket: DueBucket;
  /** Whole days from Hawaii "today" to the due date. Negative = overdue, 0 = today. */
  daysUntil: number | null;
};

/** The calendar date in Hawaii for an instant, as 'YYYY-MM-DD'. */
export function hawaiiDateString(now: Date): string {
  // 'en-CA' formats as YYYY-MM-DD, which sorts and parses cleanly.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HAWAII_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Days between two 'YYYY-MM-DD' calendar dates, ignoring clock time entirely. */
function daysBetween(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/**
 * Classify an assignment's due date.
 *
 * `course_assignments.due_date` is a bare `date` with no timezone, so it is read
 * as a calendar day in Pacific/Honolulu — the product's home timezone — and
 * compared against Hawaii "today". An item stays due (not overdue) through the
 * end of its Hawaii day, which is what a student in Honolulu would expect.
 *
 * Comparing calendar dates rather than instants is deliberate: it keeps the
 * result stable no matter what time of day the page renders.
 */
export function getDueInfo(dueDate: string | null | undefined, now: Date): DueInfo {
  if (!dueDate) return { bucket: 'undated', daysUntil: null };

  // A bare 'date' may arrive as '2026-07-15' or as a full timestamp; take the day.
  const due = dueDate.slice(0, 10);
  const daysUntil = daysBetween(hawaiiDateString(now), due);

  if (daysUntil < 0) return { bucket: 'overdue', daysUntil };
  if (daysUntil <= 3) return { bucket: 'due_soon', daysUntil };
  return { bucket: 'future', daysUntil };
}

type Sortable = { due_date?: string | null; sort_order?: number | null };

/**
 * Deterministic action-item order: overdue first (oldest first), then due soon,
 * then future, then undated — each tie-broken by due date, then sort_order.
 *
 * The raw query orders by sort_order alone, which lets an overdue item sit below
 * a dateless one. Sorting a copy; never mutates the caller's array.
 */
export function sortByDue<T extends Sortable>(items: T[], now: Date): T[] {
  return [...items].sort((a, b) => {
    const ai = getDueInfo(a.due_date, now);
    const bi = getDueInfo(b.due_date, now);

    const bucketDelta =
      DUE_BUCKETS.indexOf(ai.bucket) - DUE_BUCKETS.indexOf(bi.bucket);
    if (bucketDelta !== 0) return bucketDelta;

    if (ai.daysUntil !== null && bi.daysUntil !== null && ai.daysUntil !== bi.daysUntil) {
      return ai.daysUntil - bi.daysUntil;
    }

    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

/** How many items are past due — the count the band's header calls out. */
export function countOverdue<T extends Sortable>(items: T[], now: Date): number {
  return items.filter((i) => getDueInfo(i.due_date, now).bucket === 'overdue').length;
}
