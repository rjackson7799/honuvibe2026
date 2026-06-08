// Apply-It Workbench — model registry (executors + evaluator).
// Single source of truth for which provider / model each workbench run uses.
// See docs/plans/2026-05-27-apply-it-workbench-v1.md (Model registry).

import type { WorkbenchExecutorModel } from '@/lib/workbench/types';

export type WorkbenchProvider = 'anthropic' | 'openai' | 'google';

export interface ExecutorModelConfig {
  provider: WorkbenchProvider;
  apiId: string;
  label: string;
  envVar: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

// Student picks one of these per run. apiId / envVar are the only place the
// concrete provider model id and key name live.
export const EXECUTOR_MODELS: Record<WorkbenchExecutorModel, ExecutorModelConfig> = {
  'claude-haiku': {
    provider: 'anthropic',
    apiId: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku',
    envVar: 'ANTHROPIC_API_KEY',
    maxTokens: 1200,
    temperature: 0.7,
    timeoutMs: 25_000,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    apiId: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    envVar: 'OPENAI_API_KEY',
    maxTokens: 1200,
    temperature: 0.7,
    timeoutMs: 25_000,
  },
  'gemini-flash': {
    provider: 'google',
    apiId: 'gemini-2.0-flash',
    label: 'Gemini Flash',
    envVar: 'GOOGLE_GENAI_API_KEY',
    maxTokens: 1200,
    temperature: 0.7,
    timeoutMs: 25_000,
  },
};

export interface EvaluatorModelConfig {
  provider: WorkbenchProvider;
  apiId: string;
  envVar: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

// The rubric scorer — one call per Score. Used by the evaluator (build step 3).
export const EVALUATOR_MODEL: EvaluatorModelConfig = {
  provider: 'anthropic',
  apiId: 'claude-sonnet-4-6',
  envVar: 'ANTHROPIC_API_KEY',
  maxTokens: 1500,
  temperature: 0.3,
  timeoutMs: 25_000,
};

// Per-user/day quota caps. MUST match the constants in workbench_consume_quota
// (supabase/migrations/043_workbench.sql); the RPC enforces them server-side,
// these mirror them for display (usage meter) only.
export const WORKBENCH_DAILY_CAPS = { runs: 25, scores: 10 } as const;

/**
 * Executor models whose API key is configured in the environment. Server-side
 * only (reads process.env). The workspace dropdown renders only these, so an
 * unconfigured provider simply doesn't appear as an option.
 */
export function getAvailableExecutorModels(): WorkbenchExecutorModel[] {
  return (Object.keys(EXECUTOR_MODELS) as WorkbenchExecutorModel[]).filter((key) =>
    Boolean(process.env[EXECUTOR_MODELS[key].envVar]),
  );
}
