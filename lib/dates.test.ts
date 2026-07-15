import { describe, expect, it } from 'vitest';
import { hawaiiWeekStartUtc } from './dates';

// Reference week: Monday 2026-07-13 00:00 HST === 2026-07-13T10:00:00Z (UTC-10).
const MONDAY_2026_07_13 = '2026-07-13T10:00:00.000Z';
const MONDAY_2026_07_06 = '2026-07-06T10:00:00.000Z';

describe('hawaiiWeekStartUtc', () => {
  it('returns the preceding Monday for a mid-week instant', () => {
    // Wed 2026-07-15, 10:30 HST
    const start = hawaiiWeekStartUtc(new Date('2026-07-15T20:30:45.123Z'));
    expect(start.toISOString()).toBe(MONDAY_2026_07_13);
  });

  it('is idempotent on the boundary itself (Monday 00:00 HST)', () => {
    const start = hawaiiWeekStartUtc(new Date(MONDAY_2026_07_13));
    expect(start.toISOString()).toBe(MONDAY_2026_07_13);
  });

  it('treats Sunday 23:59 HST as the end of the previous week', () => {
    // Sun 2026-07-12, 23:59 HST — one minute before the boundary.
    const start = hawaiiWeekStartUtc(new Date('2026-07-13T09:59:00.000Z'));
    expect(start.toISOString()).toBe(MONDAY_2026_07_06);
  });

  it('uses the Hawaii calendar day, not the UTC one', () => {
    // 2026-07-13T05:00Z is already Monday in UTC, but still Sunday 19:00 in
    // Hawaii — so it belongs to the PREVIOUS week. A naive UTC implementation
    // returns 07-13 here.
    const start = hawaiiWeekStartUtc(new Date('2026-07-13T05:00:00.000Z'));
    expect(start.toISOString()).toBe(MONDAY_2026_07_06);
  });

  it('does not shift for DST — Hawaii observes none', () => {
    // Wed 2026-01-07, 10:00 HST. Boundary is Monday 2026-01-05 00:00 HST.
    // A zone with DST would land on 09:00Z here instead of 10:00Z.
    const start = hawaiiWeekStartUtc(new Date('2026-01-07T20:00:00.000Z'));
    expect(start.toISOString()).toBe('2026-01-05T10:00:00.000Z');
  });

  it('lands on a Monday for every day of a week', () => {
    // Mon 07-13 through Sun 07-19, sampled at 12:00 HST (22:00Z) each day.
    for (let day = 13; day <= 19; day++) {
      const noonHst = new Date(`2026-07-${day}T22:00:00.000Z`);
      expect(hawaiiWeekStartUtc(noonHst).toISOString()).toBe(MONDAY_2026_07_13);
    }
  });
});
