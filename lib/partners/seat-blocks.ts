/**
 * Seat-block validation shared by the admin create/edit routes.
 *
 * Sanity only — the real edit rules (immutable fields after the first grant,
 * seats_total floor, shorten/deactivate confirmation) live in the
 * `upsert_seat_block` RPC, where they are checked against the live grant count
 * inside the same transaction that performs the write.
 */

/** Guards against a fat-fingered century-long sponsorship. */
export const MAX_SEAT_WINDOW_DAYS = 366 * 5;

export function validateSeatWindow(startsAt: string, endsAt: string): string | null {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Invalid access window';
  if (end <= start) return 'Access must end after it starts';
  if (end - start > MAX_SEAT_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return 'Access window is too long';
  }
  return null;
}
