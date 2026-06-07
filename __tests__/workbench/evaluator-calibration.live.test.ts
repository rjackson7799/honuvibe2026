// Apply-It Workbench - LIVE evaluator calibration harness.
//
// Runs the 20 hand-graded prompts in evaluator-regression.json through the REAL
// Sonnet evaluator (lib/workbench/evaluator.ts -> evaluateAttempt), then asserts
// the live scores have not drifted from the hand-graded baselines beyond the
// budget: mean absolute deviation <= 0.5 PER DIMENSION (averaged across every
// case where that dimension applies).
//
// This file hits the Anthropic API and costs money, so it is fully isolated:
//   1. It lives in its own vitest project `evaluator-live` (vitest.config.ts),
//      and is excluded from the default `app` project, so it NEVER runs in
//      `pnpm test:run` / `pnpm verify` / PR CI.
//   2. It self-skips unless BOTH RUN_LIVE_EVAL=1 and ANTHROPIC_API_KEY are set.
//
// Run it manually before any evaluator-model bump or evaluator-prompt change:
//   pnpm test:eval
//
// See docs/plans/2026-05-27-apply-it-workbench-v1.md (Evaluator engineering plan,
// item 5: "Regression set, isolated from CI").

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateAttempt } from '@/lib/workbench/evaluator';
import type {
  WorkbenchDimension,
  WorkbenchLanguage,
  WorkbenchScenario,
} from '@/lib/workbench/types';
import regression from './evaluator-regression.json';

// --- Gating ----------------------------------------------------------------
// Opt-in only: needs the explicit flag AND a configured key. Either missing ->
// the whole suite is skipped (no network, no cost).
const LIVE =
  process.env.RUN_LIVE_EVAL === '1' && Boolean(process.env.ANTHROPIC_API_KEY);

// --- Regression-set shape --------------------------------------------------

interface RegressionCase {
  id: string;
  domain: WorkbenchScenario['domain'];
  language: WorkbenchLanguage;
  applicable_dimensions: WorkbenchDimension[];
  brief: string;
  expert_prompt: string;
  prompt: string;
  output: string;
  expected: Partial<Record<WorkbenchDimension, number>>;
}

interface RegressionFile {
  _meta: { drift_budget_per_dimension: number; count: number };
  cases: RegressionCase[];
}

const { _meta, cases } = regression as unknown as RegressionFile;
const DRIFT_BUDGET = _meta.drift_budget_per_dimension;

// Dimensions that actually appear in the set (so we only generate live its for
// dimensions we can measure).
const DIMENSIONS_IN_SET = [
  ...new Set(cases.flatMap((c) => c.applicable_dimensions)),
];

// --- Helpers ---------------------------------------------------------------

/**
 * Build a full WorkbenchScenario from a regression case. The evaluator only
 * reads applicable_dimensions, brief_*, and expert_prompt_*; everything else is
 * filled with type-satisfying placeholders. The case copy is already written in
 * its target language, so it is wired into whichever _en/_jp slot pickLang()
 * will read for that language.
 */
function toScenario(c: RegressionCase): WorkbenchScenario {
  const jp = c.language === 'ja';
  return {
    id: `regression-${c.id}`,
    slug: `regression-${c.id}`,
    title_en: c.id,
    title_jp: jp ? c.id : null,
    domain: c.domain,
    difficulty: 'intermediate',
    brief_en: c.brief,
    brief_jp: jp ? c.brief : null,
    applicable_dimensions: c.applicable_dimensions,
    expert_prompt_en: c.expert_prompt,
    expert_prompt_jp: jp ? c.expert_prompt : null,
    expert_output_en: '(not used by the evaluator)',
    expert_output_jp: jp ? '(not used by the evaluator)' : null,
    why_this_works_en: null,
    why_this_works_jp: null,
    is_published: true,
    is_featured: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

interface DimDrift {
  expected: number;
  actual: number;
  absDev: number;
}

// dimension -> per-case drifts, populated once by beforeAll.
const driftByDim = new Map<WorkbenchDimension, DimDrift[]>();
const caseErrors: Array<{ id: string; message: string }> = [];
let casesRun = 0;

function meanAbsDev(drifts: DimDrift[]): number {
  if (drifts.length === 0) return 0;
  return drifts.reduce((sum, d) => sum + d.absDev, 0) / drifts.length;
}

// --- Suite -----------------------------------------------------------------

describe.skipIf(!LIVE)('evaluator live calibration', () => {
  beforeAll(async () => {
    // Sanity-check the regression file itself before spending API calls.
    expect(cases).toHaveLength(_meta.count);
    for (const c of cases) {
      for (const dim of c.applicable_dimensions) {
        expect(
          c.expected[dim],
          `case "${c.id}" is missing an expected score for "${dim}"`,
        ).toBeTypeOf('number');
      }
    }

    // Run each case sequentially (gentle on rate limits; clearer logs).
    for (const c of cases) {
      try {
        const result = await evaluateAttempt({
          scenario: toScenario(c),
          attempt: {
            language: c.language,
            prompt_text: c.prompt,
            output_text: c.output,
          },
        });
        casesRun++;
        for (const dim of c.applicable_dimensions) {
          const expected = c.expected[dim]!;
          const actual = result.scores[dim];
          if (typeof actual !== 'number') {
            caseErrors.push({
              id: c.id,
              message: `evaluator returned no score for applicable dimension "${dim}"`,
            });
            continue;
          }
          const drifts = driftByDim.get(dim) ?? [];
          drifts.push({ expected, actual, absDev: Math.abs(actual - expected) });
          driftByDim.set(dim, drifts);
        }
      } catch (err) {
        caseErrors.push({
          id: c.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Calibration report -> stdout (vitest surfaces console output).
    const summary = DIMENSIONS_IN_SET.map((dim) => {
      const drifts = driftByDim.get(dim) ?? [];
      return {
        dimension: dim,
        cases: drifts.length,
        meanAbsDev: Number(meanAbsDev(drifts).toFixed(3)),
        maxAbsDev: drifts.reduce((m, d) => Math.max(m, d.absDev), 0),
        budget: DRIFT_BUDGET,
      };
    });
    const allDrifts = [...driftByDim.values()].flat();
    // eslint-disable-next-line no-console
    console.log(
      `\nEvaluator calibration: ${casesRun}/${cases.length} cases scored, ` +
        `${caseErrors.length} error(s). Overall mean abs deviation: ` +
        `${Number(meanAbsDev(allDrifts).toFixed(3))} (budget ${DRIFT_BUDGET}/dim).`,
    );
    // eslint-disable-next-line no-console
    console.table(summary);
    if (caseErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Evaluator calibration errors:', caseErrors);
    }
  }, 600_000);

  it('scores every case without a provider/parse/schema error', () => {
    expect(caseErrors, JSON.stringify(caseErrors, null, 2)).toHaveLength(0);
    expect(casesRun).toBe(cases.length);
  });

  for (const dim of DIMENSIONS_IN_SET) {
    it(`dimension "${dim}" stays within +/-${DRIFT_BUDGET} mean drift`, () => {
      const drifts = driftByDim.get(dim) ?? [];
      expect(
        drifts.length,
        `no live scores recorded for "${dim}"`,
      ).toBeGreaterThan(0);
      expect(meanAbsDev(drifts)).toBeLessThanOrEqual(DRIFT_BUDGET);
    });
  }
});
