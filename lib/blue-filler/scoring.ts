// Blue Filler — scoring and exit math. Pure functions, no I/O, no clock.
//
// TWO COMPUTATION SITES, PARITY-PINNED. This module computes composite + grade
// at generation-insert time; migration 066's blue_filler_composite_for /
// blue_filler_grade_for compute them inside finalize_blue_filler_research at
// research-finalize time. SCORING_PARITY_FIXTURE below is asserted against BOTH
// (unit tests here, SQL assertions in supabase/tests/blue_filler_rls.test.ts) so
// the two can never drift.
//
// The model never emits composite or grade — only the six 1-10 sub-scores.
// Weights or bands changing is behavior-affecting: bump BF_PIPELINE_VERSION.

import { SCORE_KEYS, type ExitAssumptions, type ExitMath, type Grade, type ScoreKey, type Scores } from './types';

/** gap carries 25; the other five carry 15 each. Sums to 100. */
export const SCORE_WEIGHTS: Record<ScoreKey, number> = {
  gap: 25,
  market: 15,
  fit: 15,
  speed: 15,
  moat: 15,
  exit: 15,
};

export const GRADE_BANDS: readonly { min: number; grade: Grade }[] = [
  { min: 80, grade: 'A' },
  { min: 65, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 35, grade: 'D' },
  { min: 0, grade: 'F' },
];

/**
 * composite = round(sum(score * weight) / 10). With every score in 1-10 the
 * result is 10-100, inside the DB's 0-100 CHECK.
 *
 * Throws on anything malformed — this is a source of truth, not a lenient
 * utility, and it mirrors the SQL helper's RAISE behavior exactly.
 */
export function computeComposite(scores: Scores): number {
  let weighted = 0;
  for (const key of SCORE_KEYS) {
    const value = scores[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
      throw new Error(`computeComposite: score "${key}" must be an integer 1-10 (got ${String(value)})`);
    }
    weighted += value * SCORE_WEIGHTS[key];
  }
  return Math.round(weighted / 10);
}

/** A >= 80 / B >= 65 / C >= 50 / D >= 35 / F. Throws outside 0-100. */
export function computeGrade(composite: number): Grade {
  if (typeof composite !== 'number' || !Number.isInteger(composite) || composite < 0 || composite > 100) {
    throw new Error(`computeGrade: composite must be an integer 0-100 (got ${String(composite)})`);
  }
  return GRADE_BANDS.find((band) => composite >= band.min)!.grade;
}

export function scoreIdea(scores: Scores): { composite: number; grade: Grade } {
  const composite = computeComposite(scores);
  return { composite, grade: computeGrade(composite) };
}

// ---------------------------------------------------------------------------
// Exit math
// ---------------------------------------------------------------------------

/**
 * Sanity bounds, deliberately WIDER than the $20-30M thesis band. The prompt
 * targets $20-30M and demands a justification sentence outside it; these bounds
 * only reject values that are nonsense. Out-of-thesis-band numbers are surfaced
 * (see THESIS_BAND + the UI badge), never silently dropped.
 */
export const EXIT_BOUNDS = {
  assumed_multiple: { min: 2, max: 10 },
  price_point_monthly_usd: { min: 20, max: 20_000 },
  target_exit_usd: { min: 5_000_000, max: 100_000_000 },
} as const;

/** The advisor thesis Ryan is building against. Inclusive. */
export const THESIS_BAND = { min: 20_000_000, max: 30_000_000 } as const;

const ARR_ROUNDING_USD = 10_000;

/**
 * Derives the ARR the business must reach to clear the target exit at the
 * assumed multiple, and how many customers that takes at the assumed price.
 *
 * needed_arr_usd is rounded to the nearest $10k, and customers_needed is
 * computed FROM THAT ROUNDED FIGURE so the two displayed numbers are always
 * consistent with each other.
 *
 * Throws on out-of-bounds assumptions (zod rejects them first at the tool
 * boundary; this is the second line of defense).
 */
export function computeExitMath(assumptions: ExitAssumptions): ExitMath {
  for (const [key, bounds] of Object.entries(EXIT_BOUNDS) as [
    keyof typeof EXIT_BOUNDS,
    { min: number; max: number },
  ][]) {
    const value = assumptions[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < bounds.min || value > bounds.max) {
      throw new Error(
        `computeExitMath: ${key} must be between ${bounds.min} and ${bounds.max} (got ${String(value)})`,
      );
    }
  }

  const rawArr = assumptions.target_exit_usd / assumptions.assumed_multiple;
  const needed_arr_usd = Math.round(rawArr / ARR_ROUNDING_USD) * ARR_ROUNDING_USD;
  const customers_needed = Math.ceil(needed_arr_usd / (assumptions.price_point_monthly_usd * 12));

  return { needed_arr_usd, customers_needed };
}

export function isInThesisBand(targetExitUsd: number): boolean {
  return targetExitUsd >= THESIS_BAND.min && targetExitUsd <= THESIS_BAND.max;
}

// ---------------------------------------------------------------------------
// TS <-> SQL parity fixture
// ---------------------------------------------------------------------------

export interface ParityCase {
  label: string;
  scores: Scores;
  composite: number;
  grade: Grade;
}

/**
 * Consumed by BOTH the unit tests (against computeComposite/computeGrade) and
 * the RLS suite (against blue_filler_composite_for/blue_filler_grade_for). Every
 * grade band edge is represented, plus the floor, the ceiling, and a case whose
 * weighted total ends in 5 so the two implementations' rounding is compared on a
 * genuine half (JS rounds half up; Postgres numeric rounds half away from zero —
 * identical for the positive values this function can produce).
 */
export const SCORING_PARITY_FIXTURE: readonly ParityCase[] = [
  { label: 'floor (all 1s)', scores: { gap: 1, market: 1, fit: 1, speed: 1, moat: 1, exit: 1 }, composite: 10, grade: 'F' },
  { label: 'F/D edge - just below', scores: { gap: 1, market: 5, fit: 4, speed: 4, moat: 4, exit: 4 }, composite: 34, grade: 'F' },
  { label: 'half-rounding case (weighted 345)', scores: { gap: 3, market: 4, fit: 4, speed: 4, moat: 3, exit: 3 }, composite: 35, grade: 'D' },
  { label: 'D band edge', scores: { gap: 2, market: 4, fit: 4, speed: 4, moat: 4, exit: 4 }, composite: 35, grade: 'D' },
  { label: 'C/D edge - just below', scores: { gap: 4, market: 6, fit: 5, speed: 5, moat: 5, exit: 5 }, composite: 49, grade: 'D' },
  { label: 'C band edge (all 5s)', scores: { gap: 5, market: 5, fit: 5, speed: 5, moat: 5, exit: 5 }, composite: 50, grade: 'C' },
  { label: 'B/C edge - just below', scores: { gap: 7, market: 7, fit: 6, speed: 6, moat: 6, exit: 6 }, composite: 64, grade: 'C' },
  { label: 'B band edge', scores: { gap: 8, market: 6, fit: 6, speed: 6, moat: 6, exit: 6 }, composite: 65, grade: 'B' },
  { label: 'A/B edge - just below', scores: { gap: 10, market: 8, fit: 7, speed: 7, moat: 7, exit: 7 }, composite: 79, grade: 'B' },
  { label: 'A band edge (all 8s)', scores: { gap: 8, market: 8, fit: 8, speed: 8, moat: 8, exit: 8 }, composite: 80, grade: 'A' },
  { label: 'gap-weighted A', scores: { gap: 10, market: 8, fit: 8, speed: 8, moat: 8, exit: 8 }, composite: 85, grade: 'A' },
  { label: 'ceiling (all 10s)', scores: { gap: 10, market: 10, fit: 10, speed: 10, moat: 10, exit: 10 }, composite: 100, grade: 'A' },
];
