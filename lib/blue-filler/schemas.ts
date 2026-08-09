// Blue Filler — zod schemas + forced-tool definitions.
//
// Every schema that parses model output is STRICT: an unknown key is a rejection,
// not a silently-dropped field. That is what keeps the model from smuggling in a
// slug, a composite, a grade, or its own exit math — all of which are code-owned.
//
// The DB bounds the text COLUMNS (066); these schemas bound the jsonb INTERIORS,
// which pg_column_size checks cannot do without being brittle.

import { z } from 'zod';
import { INDUSTRY_KEYS } from './industry-map';
import { EXIT_BOUNDS } from './scoring';
import { SCORE_KEYS } from './types';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const scoreValue = z.number().int().min(1).max(10);

/** Exactly the six keys, each an integer 1-10. Mirrors blue_filler_composite_for. */
export const scoresSchema = z.strictObject({
  gap: scoreValue,
  market: scoreValue,
  fit: scoreValue,
  speed: scoreValue,
  moat: scoreValue,
  exit: scoreValue,
});

export const industryKeySchema = z.enum(INDUSTRY_KEYS as readonly [string, ...string[]]);

export const exitAssumptionsSchema = z.strictObject({
  assumed_multiple: z
    .number()
    .min(EXIT_BOUNDS.assumed_multiple.min)
    .max(EXIT_BOUNDS.assumed_multiple.max),
  price_point_monthly_usd: z
    .number()
    .min(EXIT_BOUNDS.price_point_monthly_usd.min)
    .max(EXIT_BOUNDS.price_point_monthly_usd.max),
  target_exit_usd: z
    .number()
    .min(EXIT_BOUNDS.target_exit_usd.min)
    .max(EXIT_BOUNDS.target_exit_usd.max),
});

// ---------------------------------------------------------------------------
// Idea generation — submit_blue_filler_idea
// ---------------------------------------------------------------------------

const proseField = z.string().min(1).max(1200);

/**
 * What the MODEL emits. Deliberately absent: slug (code-owned, slugified from
 * the title), exit_math and exit_in_thesis_band (both computed in
 * lib/blue-filler/scoring.ts), composite and grade.
 */
export const generatedThesisSchema = z.strictObject({
  target_user: proseField,
  pain: proseField,
  ai_solution: proseField,
  service_attachment: proseField,
  adoption_blocker: proseField,
  moat_angle: proseField,
  mvp_scope: z.string().min(1).max(2000),
  exit_assumptions: exitAssumptionsSchema,
  acquirer_hypothesis: z.array(z.string().min(1).max(300)).min(1).max(3),
});

export const generatedIdeaSchema = z.strictObject({
  title: z.string().min(3).max(120),
  one_liner: z.string().min(1).max(200),
  summary_md: z.string().min(1).max(8000),
  thesis: generatedThesisSchema,
  scores: scoresSchema,
  industry_key: industryKeySchema,
});
export type GeneratedIdea = z.infer<typeof generatedIdeaSchema>;

const SCORE_TOOL_PROPERTIES = {
  type: 'object' as const,
  description:
    'Six sub-scores, each an integer 1-10. Do NOT compute a composite or a letter grade — those are derived from these scores in code.',
  properties: Object.fromEntries(
    SCORE_KEYS.map((key) => [
      key,
      { type: 'integer' as const, minimum: 1, maximum: 10 },
    ]),
  ),
  required: [...SCORE_KEYS],
};

export const IDEA_TOOL = {
  name: 'submit_blue_filler_idea',
  description: 'Submit exactly one Blue Filler opportunity.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        description: 'A short, concrete product name or working title. 3-120 characters.',
      },
      one_liner: {
        type: 'string' as const,
        description:
          'One plain sentence: what it is and who it is for. No markdown. Max 200 characters.',
      },
      summary_md: {
        type: 'string' as const,
        description:
          'Markdown: the full pitch — the gap, the wedge, how it is sold, and why now. Max 8000 characters.',
      },
      thesis: {
        type: 'object' as const,
        properties: {
          target_user: { type: 'string' as const, description: 'The specific role that buys and uses this.' },
          pain: { type: 'string' as const, description: 'The concrete, expensive pain today.' },
          ai_solution: { type: 'string' as const, description: 'What the software actually does with AI.' },
          service_attachment: {
            type: 'string' as const,
            description:
              'The light "services as software" layer ONE person can deliver alongside the product.',
          },
          adoption_blocker: {
            type: 'string' as const,
            description:
              'Why this industry has NOT adopted AI despite the capability existing — the real blocker, not a generic one.',
          },
          moat_angle: { type: 'string' as const, description: 'What compounds and makes this hard to copy.' },
          mvp_scope: {
            type: 'string' as const,
            description: 'The weekend-buildable v1. Be ruthless about what is cut.',
          },
          exit_assumptions: {
            type: 'object' as const,
            description:
              'Assumptions ONLY. Do not compute needed ARR or customer counts — code derives those.',
            properties: {
              assumed_multiple: {
                type: 'number' as const,
                minimum: EXIT_BOUNDS.assumed_multiple.min,
                maximum: EXIT_BOUNDS.assumed_multiple.max,
                description: 'ARR multiple a corporate acquirer would pay.',
              },
              price_point_monthly_usd: {
                type: 'number' as const,
                minimum: EXIT_BOUNDS.price_point_monthly_usd.min,
                maximum: EXIT_BOUNDS.price_point_monthly_usd.max,
                description: 'Monthly price per customer in USD.',
              },
              target_exit_usd: {
                type: 'number' as const,
                minimum: EXIT_BOUNDS.target_exit_usd.min,
                maximum: EXIT_BOUNDS.target_exit_usd.max,
                description:
                  'Target exit value in USD. Aim for 20,000,000-30,000,000; if you go outside that band, justify it in summary_md.',
              },
            },
            required: ['assumed_multiple', 'price_point_monthly_usd', 'target_exit_usd'],
          },
          acquirer_hypothesis: {
            type: 'array' as const,
            items: { type: 'string' as const },
            minItems: 1,
            maxItems: 3,
            description:
              'One to three named categories of corporate acquirer and why this is a tuck-in for them.',
          },
        },
        required: [
          'target_user',
          'pain',
          'ai_solution',
          'service_attachment',
          'adoption_blocker',
          'moat_angle',
          'mvp_scope',
          'exit_assumptions',
          'acquirer_hypothesis',
        ],
      },
      scores: SCORE_TOOL_PROPERTIES,
      industry_key: {
        type: 'string' as const,
        enum: [...INDUSTRY_KEYS],
        description: 'The industry key this idea belongs to. Must be one of the listed keys.',
      },
    },
    required: ['title', 'one_liner', 'summary_md', 'thesis', 'scores', 'industry_key'],
  },
};

// ---------------------------------------------------------------------------
// Kill memo — submit_blue_filler_kill_memo
// ---------------------------------------------------------------------------

export const generatedKillMemoSchema = z.strictObject({
  fatal_flaws: z.array(z.string().min(1).max(400)).min(2).max(5),
  strongest_counterargument: z.string().min(1).max(1200),
  cheapest_disproof: z.string().min(1).max(800),
  verdict_lean: z.enum(['kill', 'survive']),
  memo_md: z.string().min(1).max(6000),
});
export type GeneratedKillMemo = z.infer<typeof generatedKillMemoSchema>;

export const KILL_MEMO_TOOL = {
  name: 'submit_blue_filler_kill_memo',
  description: 'Submit the adversarial kill memo for one idea.',
  input_schema: {
    type: 'object' as const,
    properties: {
      fatal_flaws: {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: 2,
        maxItems: 5,
        description: 'The two to five reasons this idea most likely fails. Specific, not generic.',
      },
      strongest_counterargument: {
        type: 'string' as const,
        description: 'The best case FOR the idea, stated as fairly as you can make it.',
      },
      cheapest_disproof: {
        type: 'string' as const,
        description:
          'The cheapest, fastest experiment that would settle whether the biggest flaw is real.',
      },
      verdict_lean: {
        type: 'string' as const,
        enum: ['kill', 'survive'],
        description: 'Where you land after weighing the flaws against the counterargument.',
      },
      memo_md: {
        type: 'string' as const,
        description: 'Markdown: the memo itself. Blunt, concrete, no hedging.',
      },
    },
    required: [
      'fatal_flaws',
      'strongest_counterargument',
      'cheapest_disproof',
      'verdict_lean',
      'memo_md',
    ],
  },
};

// ---------------------------------------------------------------------------
// Research structuring (phase 2) — submit_blue_filler_report
// ---------------------------------------------------------------------------

const sectionField = z.string().min(1).max(8000);

export const researchReportSchema = z.strictObject({
  market_reality_md: sectionField,
  adoption_evidence_md: sectionField,
  competitor_landscape_md: sectionField,
  acquirer_signals_md: sectionField,
  risks_md: sectionField,
  score_rationale: z.strictObject(
    Object.fromEntries(SCORE_KEYS.map((key) => [key, z.string().min(1).max(600)])) as Record<
      (typeof SCORE_KEYS)[number],
      z.ZodString
    >,
  ),
});

export const structuredResearchSchema = z.strictObject({
  report: researchReportSchema,
  revised_scores: scoresSchema,
});
export type StructuredResearch = z.infer<typeof structuredResearchSchema>;

export const RESEARCH_REPORT_TOOL = {
  name: 'submit_blue_filler_report',
  description: 'Structure the web research findings into a report and revised sub-scores.',
  input_schema: {
    type: 'object' as const,
    properties: {
      report: {
        type: 'object' as const,
        properties: {
          market_reality_md: {
            type: 'string' as const,
            description:
              'Markdown: what the research actually shows about market size and buyer budget. Say so plainly where the research did not settle a question.',
          },
          adoption_evidence_md: {
            type: 'string' as const,
            description:
              'Markdown: evidence about how much AI this industry has actually adopted — the crux of the blue-filler thesis.',
          },
          competitor_landscape_md: {
            type: 'string' as const,
            description:
              'Markdown: who is already doing this, how well funded they are, and what they have not covered.',
          },
          acquirer_signals_md: {
            type: 'string' as const,
            description:
              'Markdown: evidence about acquirers in this space — recent tuck-in acquisitions, stated strategy, typical size.',
          },
          risks_md: {
            type: 'string' as const,
            description: 'Markdown: what the research surfaced that makes this idea worse than it looked.',
          },
          score_rationale: {
            type: 'object' as const,
            description: 'One sentence per sub-score explaining what the research changed, or confirmed.',
            properties: Object.fromEntries(
              SCORE_KEYS.map((key) => [key, { type: 'string' as const }]),
            ),
            required: [...SCORE_KEYS],
          },
        },
        required: [
          'market_reality_md',
          'adoption_evidence_md',
          'competitor_landscape_md',
          'acquirer_signals_md',
          'risks_md',
          'score_rationale',
        ],
      },
      revised_scores: SCORE_TOOL_PROPERTIES,
    },
    required: ['report', 'revised_scores'],
  },
};

// ---------------------------------------------------------------------------
// Citations (harvested in code, never model-authored)
// ---------------------------------------------------------------------------

export const CITED_TEXT_MAX = 300;
export const CITATION_CAP = 40;

export const citationSchema = z.strictObject({
  url: z.string().min(1),
  title: z.string(),
  cited_text: z.string().max(CITED_TEXT_MAX),
});

// ---------------------------------------------------------------------------
// API request bodies
// ---------------------------------------------------------------------------

// Re-exported from types.ts, which is the client-safe home for constants the UI
// needs — importing them from here would drag zod into the browser bundle.
export { SEED_EXCERPT_MAX, SEED_MIN_LENGTH } from './types';

export const generateRequestSchema = z.strictObject({
  request_id: z.string().uuid(),
  industry_key: industryKeySchema.optional(),
  mode: z.enum(['cold', 'acquirer']).optional(),
  source_text: z.string().max(20000).optional(),
});
