export const HAWAII_TZ = 'Pacific/Honolulu';

/**
 * Milliseconds to add to a UTC instant to read it as wall-clock time in `timeZone`.
 * Derived from Intl rather than hardcoded, so the offset is always the one the
 * zone actually observed at that instant.
 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const f: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') f[p.type] = Number(p.value);
  }

  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Start of the current week — Monday 00:00 in Pacific/Honolulu — returned as the
 * equivalent UTC instant, ready to hand to a timestamptz `.gte()` filter.
 *
 * A calendar week, not a rolling 7 days: the surfaces that use this are labelled
 * "this week". Hawaii is the product's home timezone and observes no DST, so the
 * offset is stable across the boundary and a single conversion is exact.
 *
 * `now` is injectable so callers (and tests) can pin the instant.
 */
export function hawaiiWeekStartUtc(now: Date = new Date()): Date {
  const offset = tzOffsetMs(now, HAWAII_TZ);

  // Shift into Hawaii wall-clock so the getUTC* accessors read Hawaii fields.
  const local = new Date(now.getTime() + offset);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7; // Mon=0 … Sun=6

  const mondayMidnightLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysSinceMonday,
  );

  return new Date(mondayMidnightLocal - offset);
}
