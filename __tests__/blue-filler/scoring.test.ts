import { describe, expect, it } from 'vitest';
import {
  computeComposite,
  computeExitMath,
  computeGrade,
  EXIT_BOUNDS,
  GRADE_BANDS,
  isInThesisBand,
  scoreIdea,
  SCORE_WEIGHTS,
  SCORING_PARITY_FIXTURE,
  THESIS_BAND,
} from '@/lib/blue-filler/scoring';
import { SCORE_KEYS, type Scores } from '@/lib/blue-filler/types';

function scores(overrides: Partial<Scores> = {}): Scores {
  return { gap: 5, market: 5, fit: 5, speed: 5, moat: 5, exit: 5, ...overrides };
}

describe('score weights', () => {
  it('sum to 100', () => {
    const total = SCORE_KEYS.reduce((sum, key) => sum + SCORE_WEIGHTS[key], 0);
    expect(total).toBe(100);
  });

  it('weights gap heaviest', () => {
    for (const key of SCORE_KEYS) {
      if (key === 'gap') continue;
      expect(SCORE_WEIGHTS.gap).toBeGreaterThan(SCORE_WEIGHTS[key]);
    }
  });
});

describe('computeComposite', () => {
  it('is bounded 10-100 across the whole valid domain', () => {
    expect(computeComposite(scores({ gap: 1, market: 1, fit: 1, speed: 1, moat: 1, exit: 1 }))).toBe(10);
    expect(
      computeComposite(scores({ gap: 10, market: 10, fit: 10, speed: 10, moat: 10, exit: 10 })),
    ).toBe(100);
  });

  it('is monotonic in every dimension', () => {
    for (const key of SCORE_KEYS) {
      const low = computeComposite(scores({ [key]: 3 } as Partial<Scores>));
      const high = computeComposite(scores({ [key]: 8 } as Partial<Scores>));
      expect(high).toBeGreaterThan(low);
    }
  });

  it('rejects out-of-range, non-integer and missing scores', () => {
    expect(() => computeComposite(scores({ gap: 0 }))).toThrow(/integer 1-10/);
    expect(() => computeComposite(scores({ gap: 11 }))).toThrow(/integer 1-10/);
    expect(() => computeComposite(scores({ gap: 5.5 }))).toThrow(/integer 1-10/);
    const missing = scores();
    delete (missing as Partial<Scores>).exit;
    expect(() => computeComposite(missing)).toThrow(/exit/);
  });
});

describe('computeGrade', () => {
  it('uses the documented band edges', () => {
    expect(computeGrade(80)).toBe('A');
    expect(computeGrade(79)).toBe('B');
    expect(computeGrade(65)).toBe('B');
    expect(computeGrade(64)).toBe('C');
    expect(computeGrade(50)).toBe('C');
    expect(computeGrade(49)).toBe('D');
    expect(computeGrade(35)).toBe('D');
    expect(computeGrade(34)).toBe('F');
    expect(computeGrade(0)).toBe('F');
  });

  it('rejects composites outside 0-100', () => {
    expect(() => computeGrade(-1)).toThrow(/0-100/);
    expect(() => computeGrade(101)).toThrow(/0-100/);
  });

  it('bands are declared in descending order with an F floor at 0', () => {
    const mins = GRADE_BANDS.map((band) => band.min);
    expect([...mins].sort((a, b) => b - a)).toEqual(mins);
    expect(mins.at(-1)).toBe(0);
  });
});

// This fixture is the TS half of the TS<->SQL parity pin. The SQL half asserts
// the same table against blue_filler_composite_for / blue_filler_grade_for in
// supabase/tests/blue_filler_rls.test.ts.
describe('SCORING_PARITY_FIXTURE', () => {
  it.each(SCORING_PARITY_FIXTURE)('$label -> $composite / $grade', (parityCase) => {
    expect(computeComposite(parityCase.scores)).toBe(parityCase.composite);
    expect(computeGrade(parityCase.composite)).toBe(parityCase.grade);
    expect(scoreIdea(parityCase.scores)).toEqual({
      composite: parityCase.composite,
      grade: parityCase.grade,
    });
  });

  it('covers every grade band', () => {
    const covered = new Set(SCORING_PARITY_FIXTURE.map((entry) => entry.grade));
    expect([...covered].sort()).toEqual(['A', 'B', 'C', 'D', 'F']);
  });

  it('includes a case whose weighted total lands on a genuine half', () => {
    const halves = SCORING_PARITY_FIXTURE.filter((entry) => {
      const weighted = SCORE_KEYS.reduce(
        (sum, key) => sum + entry.scores[key] * SCORE_WEIGHTS[key],
        0,
      );
      return weighted % 10 === 5;
    });
    expect(halves.length).toBeGreaterThan(0);
  });
});

describe('computeExitMath', () => {
  it('rounds needed ARR to the nearest $10k and ceils the customer count', () => {
    // 25,000,000 / 3 = 8,333,333.33 -> 8,330,000
    const math = computeExitMath({
      assumed_multiple: 3,
      price_point_monthly_usd: 500,
      target_exit_usd: 25_000_000,
    });
    expect(math.needed_arr_usd).toBe(8_330_000);
    // 8,330,000 / 6,000 = 1388.33 -> 1389
    expect(math.customers_needed).toBe(1389);
  });

  it('derives the customer count from the ROUNDED ARR so the two agree', () => {
    const math = computeExitMath({
      assumed_multiple: 4,
      price_point_monthly_usd: 1000,
      target_exit_usd: 20_000_000,
    });
    expect(math.needed_arr_usd).toBe(5_000_000);
    expect(math.customers_needed).toBe(Math.ceil(math.needed_arr_usd / (1000 * 12)));
  });

  it('rejects assumptions outside the sanity bounds', () => {
    const base = {
      assumed_multiple: 5,
      price_point_monthly_usd: 500,
      target_exit_usd: 25_000_000,
    };
    expect(() =>
      computeExitMath({ ...base, assumed_multiple: EXIT_BOUNDS.assumed_multiple.min - 0.1 }),
    ).toThrow(/assumed_multiple/);
    expect(() =>
      computeExitMath({ ...base, assumed_multiple: EXIT_BOUNDS.assumed_multiple.max + 0.1 }),
    ).toThrow(/assumed_multiple/);
    expect(() =>
      computeExitMath({ ...base, price_point_monthly_usd: EXIT_BOUNDS.price_point_monthly_usd.min - 1 }),
    ).toThrow(/price_point_monthly_usd/);
    expect(() =>
      computeExitMath({ ...base, target_exit_usd: EXIT_BOUNDS.target_exit_usd.max + 1 }),
    ).toThrow(/target_exit_usd/);
  });

  it('accepts the exact bound values', () => {
    expect(() =>
      computeExitMath({
        assumed_multiple: EXIT_BOUNDS.assumed_multiple.min,
        price_point_monthly_usd: EXIT_BOUNDS.price_point_monthly_usd.min,
        target_exit_usd: EXIT_BOUNDS.target_exit_usd.min,
      }),
    ).not.toThrow();
    expect(() =>
      computeExitMath({
        assumed_multiple: EXIT_BOUNDS.assumed_multiple.max,
        price_point_monthly_usd: EXIT_BOUNDS.price_point_monthly_usd.max,
        target_exit_usd: EXIT_BOUNDS.target_exit_usd.max,
      }),
    ).not.toThrow();
  });

  it('sanity bounds are deliberately wider than the thesis band', () => {
    expect(EXIT_BOUNDS.target_exit_usd.min).toBeLessThan(THESIS_BAND.min);
    expect(EXIT_BOUNDS.target_exit_usd.max).toBeGreaterThan(THESIS_BAND.max);
  });
});

describe('isInThesisBand', () => {
  it('is inclusive at both edges', () => {
    expect(isInThesisBand(THESIS_BAND.min)).toBe(true);
    expect(isInThesisBand(THESIS_BAND.max)).toBe(true);
    expect(isInThesisBand(THESIS_BAND.min - 1)).toBe(false);
    expect(isInThesisBand(THESIS_BAND.max + 1)).toBe(false);
  });
});
