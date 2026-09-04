// Engagement stage vocabulary + the stage -> leads.sales_stage mirror map.
//
// TWO ENCODING SITES, PARITY-PINNED. The SQL twin is
// public.engagement_sales_stage_for (migration 067) — the ONLY thing that
// writes leads.sales_stage once an engagement exists. This module is the TS
// twin used by the admin UI ("mirrors to lead status …") and lead-actions.
// STAGE_MIRROR_PARITY_FIXTURE below is asserted against BOTH implementations:
// stages.test.ts (unit) and supabase/tests/engagement_rls.test.ts (SQL). Change
// the map in one place without the other and a test goes red. Pure: no DB, no
// React.

export const ACTIVE_ENGAGEMENT_STAGES = ['discovery', 'proposal', 'build', 'launch', 'care'] as const;
export const TERMINAL_ENGAGEMENT_STAGES = ['lost', 'closed'] as const;
export const ENGAGEMENT_STAGES = [...ACTIVE_ENGAGEMENT_STAGES, ...TERMINAL_ENGAGEMENT_STAGES] as const;

export type ActiveEngagementStage = (typeof ACTIVE_ENGAGEMENT_STAGES)[number];
export type TerminalEngagementStage = (typeof TERMINAL_ENGAGEMENT_STAGES)[number];
export type EngagementStage = (typeof ENGAGEMENT_STAGES)[number];

/** The subset of leads.sales_stage an engagement can mirror to ('new' is unreachable). */
export type MirroredSalesStage = 'qualified' | 'proposal' | 'won' | 'lost';

// discovery -> qualified (NOT proposal: otherwise the "qualified" chip degenerates
// to "qualified for the few seconds before Ryan clicked Start"). closed -> won:
// a care plan that ended amicably is not a loss, and a finished engagement must
// never leave the won bucket or the later revenue rollup undercounts.
const STAGE_MIRROR: Record<EngagementStage, MirroredSalesStage> = {
  discovery: 'qualified',
  proposal: 'proposal',
  build: 'won',
  launch: 'won',
  care: 'won',
  closed: 'won',
  lost: 'lost',
};

export function isEngagementStage(value: unknown): value is EngagementStage {
  return typeof value === 'string' && (ENGAGEMENT_STAGES as readonly string[]).includes(value);
}

export function isTerminalStage(stage: EngagementStage): stage is TerminalEngagementStage {
  return (TERMINAL_ENGAGEMENT_STAGES as readonly string[]).includes(stage);
}

/**
 * The lead status the mirror writes for a stage. Throws on an unknown stage —
 * the SQL twin RAISEs — rather than coercing; a NULL here would violate
 * leads.sales_stage NOT NULL on the other side.
 */
export function salesStageFor(stage: EngagementStage): MirroredSalesStage {
  const mapped = STAGE_MIRROR[stage];
  if (!mapped) throw new Error(`salesStageFor: unknown engagement stage "${String(stage)}"`);
  return mapped;
}

export const STAGE_LABELS: Record<EngagementStage, string> = {
  discovery: 'Discovery',
  proposal: 'Proposal',
  build: 'Build',
  launch: 'Launch',
  care: 'Care',
  lost: 'Lost',
  closed: 'Closed',
};

export const SALES_STAGE_LABELS: Record<MirroredSalesStage, string> = {
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
};

export interface StageMirrorParityCase {
  stage: EngagementStage;
  sales_stage: MirroredSalesStage;
}

// Literal, not derived from STAGE_MIRROR — a fixture computed from the map under
// test would pin nothing. One entry per stage; stages.test.ts asserts coverage.
export const STAGE_MIRROR_PARITY_FIXTURE: readonly StageMirrorParityCase[] = [
  { stage: 'discovery', sales_stage: 'qualified' },
  { stage: 'proposal', sales_stage: 'proposal' },
  { stage: 'build', sales_stage: 'won' },
  { stage: 'launch', sales_stage: 'won' },
  { stage: 'care', sales_stage: 'won' },
  { stage: 'closed', sales_stage: 'won' },
  { stage: 'lost', sales_stage: 'lost' },
];
