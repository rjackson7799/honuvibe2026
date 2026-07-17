import { describe, expect, it } from 'vitest';
import { countOverdue, getDueInfo, hawaiiDateString, sortByDue } from './due-dates';

// 2026-07-15T05:00:00Z is already the 15th in UTC, but still 19:00 on the 14th
// in Hawaii (UTC-10). Every Hawaii-day assertion hinges on that gap.
const EVENING_OF_14TH = new Date('2026-07-15T05:00:00Z');
const MIDDAY_15TH = new Date('2026-07-15T22:00:00Z'); // 12:00 HST on the 15th

describe('hawaiiDateString', () => {
  it('uses the Hawaii calendar day, not the UTC one', () => {
    expect(hawaiiDateString(EVENING_OF_14TH)).toBe('2026-07-14');
    expect(hawaiiDateString(MIDDAY_15TH)).toBe('2026-07-15');
  });
});

describe('getDueInfo', () => {
  it('treats an item due today as due_soon, not overdue', () => {
    // Still the 14th in Hawaii — an item due the 14th has all day left.
    expect(getDueInfo('2026-07-14', EVENING_OF_14TH)).toEqual({
      bucket: 'due_soon',
      daysUntil: 0,
    });
  });

  it('does not mark an item overdue until the Hawaii day has passed', () => {
    // The naive UTC read would call this overdue; in Hawaii it is still today.
    expect(getDueInfo('2026-07-14', EVENING_OF_14TH).bucket).toBe('due_soon');
    // One Hawaii day later it genuinely is overdue.
    expect(getDueInfo('2026-07-14', MIDDAY_15TH)).toEqual({
      bucket: 'overdue',
      daysUntil: -1,
    });
  });

  it('buckets 1-3 days out as due_soon and beyond that as future', () => {
    expect(getDueInfo('2026-07-18', MIDDAY_15TH)).toEqual({ bucket: 'due_soon', daysUntil: 3 });
    expect(getDueInfo('2026-07-19', MIDDAY_15TH)).toEqual({ bucket: 'future', daysUntil: 4 });
  });

  it('buckets a missing due date as undated', () => {
    expect(getDueInfo(null, MIDDAY_15TH)).toEqual({ bucket: 'undated', daysUntil: null });
    expect(getDueInfo(undefined, MIDDAY_15TH)).toEqual({ bucket: 'undated', daysUntil: null });
  });

  it('accepts a full timestamp as well as a bare date', () => {
    expect(getDueInfo('2026-07-14T00:00:00Z', MIDDAY_15TH).daysUntil).toBe(-1);
  });

  it('counts days across a month boundary', () => {
    expect(getDueInfo('2026-08-01', MIDDAY_15TH).daysUntil).toBe(17);
    expect(getDueInfo('2026-06-30', MIDDAY_15TH).daysUntil).toBe(-15);
  });
});

describe('sortByDue', () => {
  it('puts overdue first and undated last, regardless of sort_order', () => {
    const items = [
      { id: 'undated', due_date: null, sort_order: 1 },
      { id: 'future', due_date: '2026-08-01', sort_order: 2 },
      { id: 'overdue', due_date: '2026-07-01', sort_order: 99 },
      { id: 'soon', due_date: '2026-07-16', sort_order: 3 },
    ];
    // The raw query orders by sort_order alone, which would put 'undated' first
    // and bury the overdue item at the bottom.
    expect(sortByDue(items, MIDDAY_15TH).map((i) => i.id)).toEqual([
      'overdue',
      'soon',
      'future',
      'undated',
    ]);
  });

  it('orders overdue items oldest first', () => {
    const items = [
      { id: 'recent', due_date: '2026-07-14', sort_order: 1 },
      { id: 'ancient', due_date: '2026-06-01', sort_order: 2 },
    ];
    expect(sortByDue(items, MIDDAY_15TH).map((i) => i.id)).toEqual(['ancient', 'recent']);
  });

  it('breaks ties on sort_order within the same due date', () => {
    const items = [
      { id: 'b', due_date: '2026-07-16', sort_order: 2 },
      { id: 'a', due_date: '2026-07-16', sort_order: 1 },
    ];
    expect(sortByDue(items, MIDDAY_15TH).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('orders undated items by sort_order', () => {
    const items = [
      { id: 'b', due_date: null, sort_order: 2 },
      { id: 'a', due_date: null, sort_order: 1 },
    ];
    expect(sortByDue(items, MIDDAY_15TH).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input', () => {
    const items = [
      { id: 'undated', due_date: null, sort_order: 1 },
      { id: 'overdue', due_date: '2026-07-01', sort_order: 2 },
    ];
    sortByDue(items, MIDDAY_15TH);
    expect(items.map((i) => i.id)).toEqual(['undated', 'overdue']);
  });
});

describe('countOverdue', () => {
  it('counts only past-due items', () => {
    const items = [
      { due_date: '2026-07-01', sort_order: 1 },
      { due_date: '2026-07-02', sort_order: 2 },
      { due_date: '2026-07-15', sort_order: 3 }, // today
      { due_date: null, sort_order: 4 },
    ];
    expect(countOverdue(items, MIDDAY_15TH)).toBe(2);
  });

  it('does not count an item due today at the Hawaii day edge', () => {
    expect(countOverdue([{ due_date: '2026-07-14', sort_order: 1 }], EVENING_OF_14TH)).toBe(0);
  });
});
