// Apply-It Workbench — Zod schemas + TypeScript types
// Mirrors Supabase schema from supabase/migrations/043_workbench.sql
// (workbench_scenarios, workbench_attempts, workbench_saved_prompts, workbench_daily_usage)

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums (single source of truth — Zod schema + derived TS type)
// ---------------------------------------------------------------------------

export const WORKBENCH_DOMAINS = ['marketing', 'operations', 'communication'] as const;
export const workbenchDomainSchema = z.enum(WORKBENCH_DOMAINS);
export type WorkbenchDomain = z.infer<typeof workbenchDomainSchema>;

export const WORKBENCH_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const workbenchDifficultySchema = z.enum(WORKBENCH_DIFFICULTIES);
export type WorkbenchDifficulty = z.infer<typeof workbenchDifficultySchema>;

// Attempt / saved-prompt language. Scenarios carry bilingual _en/_jp fields
// instead of a single language column, so this enum is not used there.
export const workbenchLanguageSchema = z.enum(['en', 'ja']);
export type WorkbenchLanguage = z.infer<typeof workbenchLanguageSchema>;

export const workbenchExecutorModelSchema = z.enum([
  'claude-haiku',
  'gpt-4o-mini',
  'gemini-flash',
]);
export type WorkbenchExecutorModel = z.infer<typeof workbenchExecutorModelSchema>;

export const workbenchSavedPromptSourceSchema = z.enum(['own', 'expert']);
export type WorkbenchSavedPromptSource = z.infer<
  typeof workbenchSavedPromptSourceSchema
>;

// The six prompting dimensions a scenario can exercise. A scenario's
// applicable_dimensions is a non-empty subset of these.
export const WORKBENCH_DIMENSIONS = [
  'role',
  'context',
  'task',
  'constraints',
  'format',
  'examples',
] as const;
export const workbenchDimensionSchema = z.enum(WORKBENCH_DIMENSIONS);
export type WorkbenchDimension = z.infer<typeof workbenchDimensionSchema>;

// ---------------------------------------------------------------------------
// Scores (shape of workbench_attempts.scores_json)
// ---------------------------------------------------------------------------
// The evaluator emits one integer 0-5 per applicable dimension only, so every
// key is optional. Overall score (0-100) is denormalized onto the row.

export const workbenchDimensionScoreSchema = z.number().int().min(0).max(5);

export const workbenchScoresSchema = z
  .object({
    role: workbenchDimensionScoreSchema,
    context: workbenchDimensionScoreSchema,
    task: workbenchDimensionScoreSchema,
    constraints: workbenchDimensionScoreSchema,
    format: workbenchDimensionScoreSchema,
    examples: workbenchDimensionScoreSchema,
  })
  .partial();
export type WorkbenchScores = z.infer<typeof workbenchScoresSchema>;

// ---------------------------------------------------------------------------
// Evaluator output contract (the JSON the Sonnet evaluator must emit)
// ---------------------------------------------------------------------------
// Richer than scores_json: each applicable dimension carries the integer score
// plus the rationale + improvement text shown in the rubric panel. Only the
// numeric scores are denormalized into scores_json / overall_score; the text
// fields feed the immediate Score response and the derived strengths /
// improvements lists.

export const workbenchDimensionResultSchema = z.object({
  score: workbenchDimensionScoreSchema, // int 0-5
  rationale: z.string().trim().min(1), // why this score earned, in the prompt's language
  improvement: z.string().trim().min(1), // how to raise it, in the prompt's language
});
export type WorkbenchDimensionResult = z.infer<
  typeof workbenchDimensionResultSchema
>;

// Full evaluator response. Only a scenario's applicable dimensions are present,
// so every key is optional; the evaluator additionally asserts that exactly the
// applicable set was returned.
export const workbenchEvaluatorResultSchema = z
  .object({
    role: workbenchDimensionResultSchema,
    context: workbenchDimensionResultSchema,
    task: workbenchDimensionResultSchema,
    constraints: workbenchDimensionResultSchema,
    format: workbenchDimensionResultSchema,
    examples: workbenchDimensionResultSchema,
  })
  .partial();
export type WorkbenchEvaluatorResult = z.infer<
  typeof workbenchEvaluatorResultSchema
>;

// ---------------------------------------------------------------------------
// DB row — workbench_scenarios
// ---------------------------------------------------------------------------

export interface WorkbenchScenario {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  domain: WorkbenchDomain;
  difficulty: WorkbenchDifficulty;
  brief_en: string;
  brief_jp: string | null;
  applicable_dimensions: WorkbenchDimension[];
  expert_prompt_en: string;
  expert_prompt_jp: string | null;
  expert_output_en: string;
  expert_output_jp: string | null;
  why_this_works_en: string | null;
  why_this_works_jp: string | null;
  is_published: boolean;
  is_featured: boolean;
  /** True when _jp fields are machine-translated and awaiting human review (blocks publish). */
  jp_needs_review: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DB row — workbench_attempts
// ---------------------------------------------------------------------------

export interface WorkbenchAttempt {
  id: string;
  user_id: string;
  scenario_id: string;
  version: number;
  language: WorkbenchLanguage;
  executor_model: WorkbenchExecutorModel;
  prompt_text: string;
  output_text: string;
  scores_json: WorkbenchScores | null;
  overall_score: number | null;
  strengths: string[] | null;
  improvements: string[] | null;
  expert_revealed_at: string | null;
  created_at: string;
  scored_at: string | null;
}

// ---------------------------------------------------------------------------
// DB row — workbench_saved_prompts
// ---------------------------------------------------------------------------

export interface WorkbenchSavedPrompt {
  id: string;
  user_id: string;
  prompt_text: string;
  language: WorkbenchLanguage;
  source: WorkbenchSavedPromptSource;
  source_scenario_id: string | null;
  source_attempt_id: string | null;
  tags: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DB row — workbench_daily_usage
// ---------------------------------------------------------------------------

export interface WorkbenchDailyUsage {
  user_id: string;
  usage_date: string;
  runs_count: number;
  evaluations_count: number;
}

// ---------------------------------------------------------------------------
// Admin authoring input shapes (scenario CRUD — build step 5)
// ---------------------------------------------------------------------------
// Zod schemas validate the create/update server-action payloads before they
// reach the service-role client (mirrors lib/admin/course-survey-actions.ts).
// The NOT NULL columns (slug, title_en, domain, difficulty, brief_en,
// applicable_dimensions, expert_prompt_en, expert_output_en) are required on
// create; _jp companions and why_this_works are optional at create time and
// enforced at publish by validateScenarioForPublish (lib/workbench/validation.ts).

export const createWorkbenchScenarioSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required.')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase letters, numbers, and hyphens only.',
    ),
  title_en: z.string().trim().min(1, 'Title (EN) is required.'),
  title_jp: z.string().nullable().optional(),
  domain: workbenchDomainSchema,
  difficulty: workbenchDifficultySchema,
  brief_en: z.string().trim().min(1, 'Brief (EN) is required.'),
  brief_jp: z.string().nullable().optional(),
  applicable_dimensions: z
    .array(workbenchDimensionSchema)
    .min(1, 'Select at least one applicable dimension.'),
  expert_prompt_en: z.string().trim().min(1, 'Expert prompt (EN) is required.'),
  expert_prompt_jp: z.string().nullable().optional(),
  expert_output_en: z.string().trim().min(1, 'Expert output (EN) is required.'),
  expert_output_jp: z.string().nullable().optional(),
  why_this_works_en: z.string().nullable().optional(),
  why_this_works_jp: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  jp_needs_review: z.boolean().optional(),
});
export type CreateWorkbenchScenarioInput = z.infer<
  typeof createWorkbenchScenarioSchema
>;

export const updateWorkbenchScenarioSchema = createWorkbenchScenarioSchema.partial();
export type UpdateWorkbenchScenarioInput = z.infer<
  typeof updateWorkbenchScenarioSchema
>;

// ---------------------------------------------------------------------------
// Workspace shapes (build step 7)
// ---------------------------------------------------------------------------
// The scenario fields safe to hand the client workspace. Expert fields are
// deliberately excluded — they reach the client only via the reveal-expert
// route, after the member has run + revealed (the reveal gate).
export type WorkbenchWorkspaceScenario = Pick<
  WorkbenchScenario,
  | 'id'
  | 'slug'
  | 'title_en'
  | 'title_jp'
  | 'domain'
  | 'difficulty'
  | 'brief_en'
  | 'brief_jp'
  | 'applicable_dimensions'
>;

// The bilingual expert payload returned by reveal-expert (client picks locale).
export interface WorkbenchExpertContent {
  expert_prompt_en: string;
  expert_prompt_jp: string | null;
  expert_output_en: string;
  expert_output_jp: string | null;
  why_this_works_en: string | null;
  why_this_works_jp: string | null;
}

// Usage snapshot for the meter (GET /api/workbench/usage).
export interface WorkbenchUsage {
  runs: { used: number; cap: number };
  scores: { used: number; cap: number };
}
