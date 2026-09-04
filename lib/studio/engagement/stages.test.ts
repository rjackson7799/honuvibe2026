import { describe, expect, it } from 'vitest';
import {
  ACTIVE_ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGES,
  STAGE_LABELS,
  STAGE_MIRROR_PARITY_FIXTURE,
  TERMINAL_ENGAGEMENT_STAGES,
  isEngagementStage,
  isTerminalStage,
  salesStageFor,
  type EngagementStage,
} from './stages';

// The TS half of the TS<->SQL mirror parity pin. The SQL half
// (public.engagement_sales_stage_for) is asserted against the SAME fixture in
// supabase/tests/engagement_rls.test.ts.

describe('stage vocabulary', () => {
  it('is five active stages plus two terminals, with no overlap', () => {
    expect(ACTIVE_ENGAGEMENT_STAGES).toEqual(['discovery', 'proposal', 'build', 'launch', 'care']);
    expect(TERMINAL_ENGAGEMENT_STAGES).toEqual(['lost', 'closed']);
    expect(new Set(ENGAGEMENT_STAGES).size).toBe(7);
  });

  it('isTerminalStage is true for exactly lost and closed', () => {
    const terminals = ENGAGEMENT_STAGES.filter((s) => isTerminalStage(s));
    expect(terminals).toEqual(['lost', 'closed']);
  });

  it('isEngagementStage rejects strings outside the vocabulary', () => {
    expect(isEngagementStage('discovery')).toBe(true);
    expect(isEngagementStage('won')).toBe(false); // a lead status, not a stage
    expect(isEngagementStage('bogus')).toBe(false);
    expect(isEngagementStage(null)).toBe(false);
  });

  it('every stage has a label', () => {
    for (const stage of ENGAGEMENT_STAGES) expect(STAGE_LABELS[stage]).toBeTruthy();
  });
});

describe('salesStageFor (the mirror map)', () => {
  it.each(STAGE_MIRROR_PARITY_FIXTURE)('$stage -> $sales_stage', ({ stage, sales_stage }) => {
    expect(salesStageFor(stage)).toBe(sales_stage);
  });

  it('the parity fixture covers every stage exactly once', () => {
    const covered = STAGE_MIRROR_PARITY_FIXTURE.map((c) => c.stage).sort();
    expect(covered).toEqual([...ENGAGEMENT_STAGES].sort());
  });

  it('never returns "new" — an engagement can only open from a qualified lead', () => {
    for (const stage of ENGAGEMENT_STAGES) expect(salesStageFor(stage)).not.toBe('new');
  });

  it('the five chips partition the pipeline: discovery is qualified, closed stays won', () => {
    expect(salesStageFor('discovery')).toBe('qualified');
    expect(salesStageFor('closed')).toBe('won');
    expect(salesStageFor('lost')).toBe('lost');
  });

  it('throws on an unknown stage rather than coercing (parity with the SQL RAISE)', () => {
    expect(() => salesStageFor('bogus' as EngagementStage)).toThrow(/unknown engagement stage/);
  });
});
