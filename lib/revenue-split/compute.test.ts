import { describe, expect, it } from 'vitest';
import {
  computeEnrollmentSplit,
  roundHalfAwayFromZero,
} from '@/lib/revenue-split/compute';

describe('roundHalfAwayFromZero', () => {
  it('rounds halves away from zero', () => {
    expect(roundHalfAwayFromZero(1.5)).toBe(2);
    expect(roundHalfAwayFromZero(1.49)).toBe(1);
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2);
    expect(roundHalfAwayFromZero(-1.49)).toBe(-1);
  });
});

describe('computeEnrollmentSplit', () => {
  it('keeps the full amount with HonuVibe when no shares are configured', () => {
    expect(
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: 0,
        instructorSharePct: 0,
        instructorWeights: [],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 0,
      honuvibe: 10000,
      per_instructor: [],
    });
  });

  it('gives everything to one instructor at 100%', () => {
    expect(
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: 0,
        instructorSharePct: 100,
        instructorWeights: [{ instructor_id: 'ins_1', pct: 100 }],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 10000,
      honuvibe: 0,
      per_instructor: [{ instructor_id: 'ins_1', amount: 10000 }],
    });
  });

  it('splits a 50% instructor pool proportionally and deterministically', () => {
    expect(
      computeEnrollmentSplit({
        gross: 999,
        partnerSharePct: 0,
        instructorSharePct: 50,
        instructorWeights: [
          { instructor_id: 'ins_1', pct: 60 },
          { instructor_id: 'ins_2', pct: 40 },
        ],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 500,
      honuvibe: 499,
      per_instructor: [
        { instructor_id: 'ins_1', amount: 300 },
        { instructor_id: 'ins_2', amount: 200 },
      ],
    });
  });

  it('computes a full partner plus instructor snapshot', () => {
    expect(
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: 10,
        instructorSharePct: 30,
        instructorWeights: [
          { instructor_id: 'ins_1', pct: 33 },
          { instructor_id: 'ins_2', pct: 33 },
          { instructor_id: 'ins_3', pct: 34 },
        ],
      }),
    ).toEqual({
      partner: 1000,
      instructor_total: 3000,
      honuvibe: 6000,
      per_instructor: [
        { instructor_id: 'ins_1', amount: 990 },
        { instructor_id: 'ins_2', amount: 990 },
        { instructor_id: 'ins_3', amount: 1020 },
      ],
    });
  });

  it('collapses the instructor pool into HonuVibe when there are no instructor weights', () => {
    expect(
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: 5,
        instructorSharePct: 30,
        instructorWeights: [],
      }),
    ).toEqual({
      partner: 500,
      instructor_total: 0,
      honuvibe: 9500,
      per_instructor: [],
    });
  });

  it('allocates proportionally even when weights do not sum to 100', () => {
    expect(
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: 0,
        instructorSharePct: 30,
        instructorWeights: [
          { instructor_id: 'ins_1', pct: 49 },
          { instructor_id: 'ins_2', pct: 50 },
        ],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 3000,
      honuvibe: 7000,
      per_instructor: [
        { instructor_id: 'ins_1', amount: 1485 },
        { instructor_id: 'ins_2', amount: 1515 },
      ],
    });
  });

  it('allocates proportionally when weights sum above 100', () => {
    expect(
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: 0,
        instructorSharePct: 30,
        instructorWeights: [
          { instructor_id: 'ins_1', pct: 50 },
          { instructor_id: 'ins_2', pct: 51 },
        ],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 3000,
      honuvibe: 7000,
      per_instructor: [
        { instructor_id: 'ins_1', amount: 1485 },
        { instructor_id: 'ins_2', amount: 1515 },
      ],
    });
  });

  it('distributes instructor rounding residue deterministically to the largest weight', () => {
    expect(
      computeEnrollmentSplit({
        gross: 1000,
        partnerSharePct: 0,
        instructorSharePct: 1,
        instructorWeights: [
          { instructor_id: 'ins_1', pct: 33 },
          { instructor_id: 'ins_2', pct: 33 },
          { instructor_id: 'ins_3', pct: 34 },
        ],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 10,
      honuvibe: 990,
      per_instructor: [
        { instructor_id: 'ins_1', amount: 3 },
        { instructor_id: 'ins_2', amount: 3 },
        { instructor_id: 'ins_3', amount: 4 },
      ],
    });
  });

  it('handles JPY values as integers', () => {
    expect(
      computeEnrollmentSplit({
        gross: 1000,
        partnerSharePct: 0,
        instructorSharePct: 33,
        instructorWeights: [
          { instructor_id: 'ins_1', pct: 50 },
          { instructor_id: 'ins_2', pct: 50 },
        ],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 330,
      honuvibe: 670,
      per_instructor: [
        { instructor_id: 'ins_1', amount: 165 },
        { instructor_id: 'ins_2', amount: 165 },
      ],
    });
  });

  it('returns zeros when the gross is zero', () => {
    expect(
      computeEnrollmentSplit({
        gross: 0,
        partnerSharePct: 10,
        instructorSharePct: 30,
        instructorWeights: [{ instructor_id: 'ins_1', pct: 100 }],
      }),
    ).toEqual({
      partner: 0,
      instructor_total: 0,
      honuvibe: 0,
      per_instructor: [],
    });
  });

  it('throws for negative percentages', () => {
    expect(() =>
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: -1,
        instructorSharePct: 0,
        instructorWeights: [],
      }),
    ).toThrow('partnerSharePct must be between 0 and 100');
  });

  it('throws when partner plus instructor share exceeds 100%', () => {
    expect(() =>
      computeEnrollmentSplit({
        gross: 10000,
        partnerSharePct: 80,
        instructorSharePct: 30,
        instructorWeights: [],
      }),
    ).toThrow('partnerSharePct + instructorSharePct cannot exceed 100');
  });
});
