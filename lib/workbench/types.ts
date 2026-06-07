// Apply-It Workbench — Zod schemas + TypeScript types
// Mirrors Supabase schema from supabase/migrations/043_workbench.sql
// (workbench_scenarios, workbench_attempts, workbench_saved_prompts, workbench_daily_usage)

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums (single source of truth — Zod schema + derived TS type)
// ---------------------------------------------------------------------------

export const workbenchDomainSchema = z.enum([
  'marketing',
  'operations',
  'communication',
]);
export type WorkbenchDomain = z.infer<typeof workbenchDomainSchema>;

export const workbenchDifficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
]);
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
export const workbenchDimensionSchema = z.enum([
  'role',
  'context',
  'task',
  'constraints',
  'format',
  'examples',
]);
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
