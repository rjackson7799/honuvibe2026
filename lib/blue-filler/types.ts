// Blue Filler — shared domain + row types, and the pipeline version constant.

/**
 * BF_PIPELINE_VERSION — stamped on every idea, research row and kill memo.
 *
 * BUMP RULE: any behavior-affecting change bumps this. That includes prompts,
 * tool schemas, tool config (model IDs, max_uses, web-search tool version),
 * scoring weights or grade bands, exit-math bounds, and the industry map data.
 *
 * REPRODUCIBILITY STANCE: the map and the prompts are code constants, so any
 * historical run is reconstructable from `pipeline_version` plus the git history
 * of those files. The version labels behavior EPOCHS; there is deliberately no
 * runtime prior-snapshot column (git is the snapshot store). The coarseness is
 * accepted — a map-only edit advances the shared version, which is the honest
 * signal that downstream outputs may differ.
 *
 * A version string alone does not identify a unique commit, so every idea and
 * research row also stores a nullable `build_sha` (see buildSha() below).
 */
export const BF_PIPELINE_VERSION = 'bf-pipeline-v1';

/**
 * The exact deployed commit, when we are running on Vercel. Null in local dev,
 * where the version string plus git history is the fallback.
 */
export function buildSha(): string | null {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const SCORE_KEYS = ['gap', 'market', 'fit', 'speed', 'moat', 'exit'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];
export type Scores = Record<ScoreKey, number>;

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export const SCORE_LABELS: Record<ScoreKey, string> = {
  gap: 'Capability gap',
  market: 'Market size',
  fit: 'Founder fit',
  speed: 'Speed to MVP',
  moat: 'Moat',
  exit: 'Exit fit',
};

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

export type IdeaStatus = 'new' | 'shortlist' | 'archived';
export type IdeaOrigin = 'cold' | 'seeded' | 'acquirer';
export type IdeaVerdict = 'interested' | 'pass';

/** Model-supplied assumptions only — the arithmetic is done in code. */
export interface ExitAssumptions {
  assumed_multiple: number;
  price_point_monthly_usd: number;
  target_exit_usd: number;
}

/** Derived in lib/blue-filler/scoring.ts. The model never emits these. */
export interface ExitMath {
  needed_arr_usd: number;
  customers_needed: number;
}

export interface IdeaThesis {
  target_user: string;
  pain: string;
  ai_solution: string;
  service_attachment: string;
  adoption_blocker: string;
  moat_angle: string;
  mvp_scope: string;
  exit_assumptions: ExitAssumptions;
  /** Code-computed. */
  exit_math: ExitMath;
  /** Code-computed: is target_exit_usd inside the $20-30M thesis band? */
  exit_in_thesis_band: boolean;
  acquirer_hypothesis: string[];
}

export interface KillMemo {
  fatal_flaws: string[];
  strongest_counterargument: string;
  cheapest_disproof: string;
  verdict_lean: 'kill' | 'survive';
  memo_md: string;
  model_id: string;
  pipeline_version: string;
  generated_at: string;
}

export interface BlueFillerIdea {
  id: string;
  created_at: string;
  updated_at: string;
  request_id: string | null;
  title: string;
  slug: string;
  industry_key: string;
  origin: IdeaOrigin;
  source_excerpt: string | null;
  one_liner: string;
  summary_md: string;
  thesis: IdeaThesis;
  gen_scores: Scores;
  current_scores: Scores;
  composite: number;
  grade: Grade;
  status: IdeaStatus;
  verdict: IdeaVerdict | null;
  verdict_note: string | null;
  kill_memo: KillMemo | null;
  model_id: string;
  pipeline_version: string;
  build_sha: string | null;
}

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

export type ResearchStatus = 'generating' | 'completed' | 'partial' | 'failed';

/**
 * The curated error codes. This list is mirrored by a column CHECK in migration
 * 066 — an arbitrary string can never reach the DB, even via the service role.
 * Raw exceptions and provider response bodies go to the server log only.
 */
export const RESEARCH_ERROR_CODES = [
  'search_failed',
  'no_citations',
  'structuring_failed',
  'truncated',
  'timeout',
  'provider_error',
  'internal',
] as const;
export type ResearchErrorCode = (typeof RESEARCH_ERROR_CODES)[number];

export interface ResearchCitation {
  url: string;
  title: string;
  cited_text: string;
}

export interface ResearchReport {
  market_reality_md: string;
  adoption_evidence_md: string;
  competitor_landscape_md: string;
  acquirer_signals_md: string;
  risks_md: string;
  score_rationale: Record<ScoreKey, string>;
}

export interface BlueFillerResearch {
  id: string;
  idea_id: string;
  created_at: string;
  updated_at: string;
  status: ResearchStatus;
  raw_findings_md: string | null;
  report: ResearchReport | null;
  summary_md: string | null;
  citations: ResearchCitation[] | null;
  revised_scores: Scores | null;
  search_count: number;
  model_id: string | null;
  pipeline_version: string | null;
  build_sha: string | null;
  generation_error: ResearchErrorCode | null;
  completed_at: string | null;
}

/**
 * The list page never renders more than this, and says so out loud.
 *
 * It lives HERE rather than in queries.ts because client components need it:
 * importing it from queries.ts would drag lib/supabase/server (and next/headers)
 * into the browser bundle.
 */
export const IDEA_LIST_CAP = 200;

/** Seed-text bounds. Client-safe for the same reason as IDEA_LIST_CAP — the
 *  generate panel needs them and must not pull zod into the browser bundle. */
export const SEED_MIN_LENGTH = 40;
export const SEED_EXCERPT_MAX = 2000;

/** Compact row for the research history list. */
export interface ResearchSummary {
  id: string;
  created_at: string;
  status: ResearchStatus;
  search_count: number;
  citation_count: number;
}
