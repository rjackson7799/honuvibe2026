import { describe, expect, it } from 'vitest';
import { daysSince, formatDateTime, formatMinorUnits, formatRelativeDays, formatShortDate } from './format';

const NOW = Date.parse('2026-09-04T12:00:00Z');

describe('engagement date helpers', () => {
  it('formats in the operator time zone regardless of the host (no SSR/client drift)', () => {
    // 2026-09-05T03:30Z is still Sep 4, 5:30 PM in Honolulu (UTC-10).
    expect(formatShortDate('2026-09-05T03:30:00Z')).toBe('Sep 4');
    expect(formatDateTime('2026-09-05T03:30:00Z')).toBe('Sep 4, 5:30 PM');
  });

  it('daysSince floors to whole days and never goes negative', () => {
    expect(daysSince('2026-09-04T00:00:00Z', NOW)).toBe(0);
    expect(daysSince('2026-09-01T13:00:00Z', NOW)).toBe(2);
    expect(daysSince('2026-09-05T00:00:00Z', NOW)).toBe(0);
    expect(daysSince('not a date', NOW)).toBe(0);
  });

  it('formatRelativeDays reads as a chip label', () => {
    expect(formatRelativeDays(null, NOW)).toBe('—');
    expect(formatRelativeDays('2026-09-04T09:00:00Z', NOW)).toBe('today');
    expect(formatRelativeDays('2026-09-01T09:00:00Z', NOW)).toBe('3d ago');
    expect(formatRelativeDays('2026-06-01T09:00:00Z', NOW)).toBe('3mo ago');
  });
});

describe('formatMinorUnits', () => {
  it('USD is cents with two decimals; JPY is whole yen with no decimals', () => {
    expect(formatMinorUnits(87500, 'USD')).toBe('$875.00');
    expect(formatMinorUnits(6500, 'USD')).toBe('$65.00');
    expect(formatMinorUnits(250000, 'JPY')).toBe('¥250,000');
    expect(formatMinorUnits(0, 'JPY')).toBe('¥0');
  });

  it('negative adjustments keep the sign; thousands are separated', () => {
    expect(formatMinorUnits(-15000, 'USD')).toBe('-$150.00');
    expect(formatMinorUnits(1234567, 'USD')).toBe('$12,345.67');
    expect(formatMinorUnits(-20000, 'JPY')).toBe('-¥20,000');
  });
});
