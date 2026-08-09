import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const { runPhase1Mock, callForcedToolMock } = vi.hoisted(() => ({
  runPhase1Mock: vi.fn(),
  callForcedToolMock: vi.fn(),
}));

// Phase 1 itself is covered by research-phase1.test.ts; here it is a seam so the
// orchestrator's failure-classification table can be exercised directly.
vi.mock('@/lib/blue-filler/research/phase1', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/blue-filler/research/phase1')>();
  return { ...actual, runPhase1: runPhase1Mock };
});

vi.mock('@/lib/blue-filler/generator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/blue-filler/generator')>();
  return { ...actual, callForcedTool: callForcedToolMock };
});

import { BlueFillerProviderError } from '@/lib/blue-filler/generator';
import { Phase1Error, USABLE_FINDINGS_FLOOR } from '@/lib/blue-filler/research/phase1';
import {
  buildResearchSummaryMd,
  flipStaleResearch,
  RESEARCH_MODEL_ID,
  runResearch,
  STALE_MINUTES,
} from '@/lib/blue-filler/research/run';
import { BF_PIPELINE_VERSION, SCORE_KEYS } from '@/lib/blue-filler/types';
import type { BlueFillerIdea, ResearchReport, Scores } from '@/lib/blue-filler/types';

const RESEARCH_ID = 'research-1';
const LONG_FINDINGS = 'F'.repeat(USABLE_FINDINGS_FLOOR + 20);
const SHORT_FINDINGS = 'F'.repeat(20);

const GEN_SCORES: Scores = { gap: 9, market: 7, fit: 7, speed: 6, moat: 5, exit: 6 };
const REVISED_SCORES: Scores = { gap: 6, market: 5, fit: 7, speed: 6, moat: 4, exit: 5 };

const REPORT: ResearchReport = {
  market_reality_md: 'market',
  adoption_evidence_md: 'adoption',
  competitor_landscape_md: 'competitors',
  acquirer_signals_md: 'acquirers',
  risks_md: 'risks',
  score_rationale: Object.fromEntries(
    SCORE_KEYS.map((key) => [key, `because ${key}`]),
  ) as ResearchReport['score_rationale'],
};

const CITATIONS = [{ url: 'https://a.example/x', title: 'A', cited_text: 'quote' }];

const IDEA = {
  id: 'idea-1',
  title: 'Denial Desk',
  industry_key: 'healthcare-rev-cycle',
  one_liner: 'AI appeals.',
  summary_md: 'pitch',
  status: 'new',
  gen_scores: GEN_SCORES,
  current_scores: GEN_SCORES,
  thesis: {
    target_user: 'u',
    pain: 'p',
    ai_solution: 's',
    service_attachment: 'a',
    adoption_blocker: 'b',
    moat_angle: 'm',
    mvp_scope: 'v',
    exit_assumptions: {
      assumed_multiple: 4,
      price_point_monthly_usd: 800,
      target_exit_usd: 25_000_000,
    },
    exit_math: { needed_arr_usd: 6_250_000, customers_needed: 651 },
    exit_in_thesis_band: true,
    acquirer_hypothesis: ['RCM consolidators'],
  },
} as unknown as BlueFillerIdea;

interface AdminHarness {
  admin: SupabaseClient;
  updates: Record<string, unknown>[];
  rpcCalls: { name: string; payload: Record<string, unknown> }[];
  setCheckpointResult: (result: { data: unknown[] | null; error: unknown }) => void;
  setRpcResult: (result: { data: unknown; error: unknown }) => void;
}

function makeAdmin(): AdminHarness {
  const updates: Record<string, unknown>[] = [];
  const rpcCalls: { name: string; payload: Record<string, unknown> }[] = [];
  let checkpointResult: { data: unknown[] | null; error: unknown } = {
    data: [{ id: RESEARCH_ID }],
    error: null,
  };
  let rpcResult: { data: unknown; error: unknown } = { data: { applied: true }, error: null };

  const admin = {
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        // Both call sites are update().eq().eq() and then diverge:
        // the checkpoint ends in .select(), the stale flip in .lt().
        const tail = {
          select: async () => checkpointResult,
          lt: async () => ({ error: null }),
        };
        return { eq: () => ({ eq: () => tail }) };
      },
    }),
    rpc: async (name: string, payload: Record<string, unknown>) => {
      rpcCalls.push({ name, payload });
      return rpcResult;
    },
  } as unknown as SupabaseClient;

  return {
    admin,
    updates,
    rpcCalls,
    setCheckpointResult: (result) => {
      checkpointResult = result;
    },
    setRpcResult: (result) => {
      rpcResult = result;
    },
  };
}

/**
 * A runPhase1 stub that checkpoints `findingsMd` first, then resolves or throws.
 *
 * The checkpoint's RETURN VALUE drives the outcome, exactly as the real loop
 * does — so a fenced or failed checkpoint produces 'fenced'/'aborted' here
 * because run.ts's checkpoint lambda said so, not because the test asserted it.
 */
function phase1(
  checkpointFindings: string,
  then: { resolve?: Record<string, unknown>; reject?: unknown },
) {
  return async (options: {
    checkpoint: (checkpoint: {
      findingsMd: string;
      citations: typeof CITATIONS;
      searchCount: number;
    }) => Promise<string>;
  }) => {
    const base = {
      findingsMd: checkpointFindings,
      citations: CITATIONS,
      searchCount: 5,
      serverToolErrors: [],
    };

    const result = await options.checkpoint({
      findingsMd: checkpointFindings,
      citations: CITATIONS,
      searchCount: 5,
    });
    if (result === 'fenced') return { ...base, outcome: 'fenced' };
    if (result === 'error') return { ...base, outcome: 'aborted' };

    if (then.reject) throw then.reject;
    return { ...base, outcome: 'ok', ...then.resolve };
  };
}

function lastRpc(harness: AdminHarness) {
  return harness.rpcCalls.at(-1)!.payload;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  callForcedToolMock.mockResolvedValue({ report: REPORT, revised_scores: REVISED_SCORES });
});

describe('flipStaleResearch', () => {
  it('writes the audit-engine convention: failed + timeout + completed_at', async () => {
    const harness = makeAdmin();
    await flipStaleResearch(harness.admin, IDEA.id);
    expect(harness.updates).toHaveLength(1);
    expect(harness.updates[0]).toMatchObject({ status: 'failed', generation_error: 'timeout' });
    expect(harness.updates[0].completed_at).toBeTruthy();
    expect(harness.updates[0].updated_at).toBeTruthy();
  });

  it('uses a stale window longer than the run budget', () => {
    expect(STALE_MINUTES * 60_000).toBeGreaterThan(300_000);
  });
});

describe('runResearch — the happy path', () => {
  it('finalizes completed through the RPC with versioned provenance', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(harness.rpcCalls).toHaveLength(1);
    const payload = lastRpc(harness);
    expect(harness.rpcCalls[0].name).toBe('finalize_blue_filler_research');
    expect(payload.p_status).toBe('completed');
    expect(payload.p_research_id).toBe(RESEARCH_ID);
    expect(payload.p_report).toEqual(REPORT);
    expect(payload.p_citations).toEqual(CITATIONS);
    expect(payload.p_revised_scores).toEqual(REVISED_SCORES);
    expect(payload.p_search_count).toBe(5);
    expect(payload.p_model_id).toBe(RESEARCH_MODEL_ID);
    expect(payload.p_pipeline_version).toBe(BF_PIPELINE_VERSION);
    expect(payload.p_generation_error).toBeNull();
  });

  it('never sends a composite or a grade — SQL computes both', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));
    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    const payload = lastRpc(harness);
    expect(payload).not.toHaveProperty('p_composite');
    expect(payload).not.toHaveProperty('p_grade');
    expect(Object.keys(payload).some((key) => /composite|grade/i.test(key))).toBe(false);
  });

  it('never sends gen_scores anywhere in the payload', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));
    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    const serialized = JSON.stringify(lastRpc(harness));
    expect(serialized).not.toContain('gen_scores');
    expect(lastRpc(harness).p_revised_scores).not.toEqual(GEN_SCORES);
  });

  it('checkpoints citations and search_count before phase 2 runs', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));
    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(harness.updates[0]).toMatchObject({ search_count: 5 });
    expect(harness.updates[0].citations).toEqual(CITATIONS);
    expect(harness.updates[0].raw_findings_md).toBe(LONG_FINDINGS);
  });

  it('omits raw_findings_md from a checkpoint with no synthesis text', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1('', { resolve: { findingsMd: LONG_FINDINGS } }));
    await runResearch(harness.admin, RESEARCH_ID, IDEA);
    expect(harness.updates[0]).not.toHaveProperty('raw_findings_md');
  });
});

describe('runResearch — outcome routing', () => {
  it('does nothing at all when the row was fenced by a stale flip', async () => {
    const harness = makeAdmin();
    // Zero rows matched -> the real fence signal, not a hand-set outcome.
    harness.setCheckpointResult({ data: [], error: null });
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(harness.rpcCalls).toHaveLength(0);
    expect(callForcedToolMock).not.toHaveBeenCalled();
  });

  it('aborts BEFORE phase-2 spend when a checkpoint write fails', async () => {
    const harness = makeAdmin();
    harness.setCheckpointResult({ data: null, error: { message: 'db down' } });
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(callForcedToolMock).not.toHaveBeenCalled();
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it('classifies against the LAST APPLIED checkpoint, never an unwritten one', async () => {
    // A checkpoint whose write fails must not be remembered: doing so would let
    // a later failure finalize 'partial' against a row whose raw_findings_md was
    // never stored, which the DB's partial CHECK rejects.
    const harness = makeAdmin();
    harness.setCheckpointResult({ data: null, error: { message: 'db down' } });
    runPhase1Mock.mockImplementation(async (options: Parameters<typeof runPhase1Mock>[0]) => {
      await options.checkpoint({
        findingsMd: LONG_FINDINGS,
        citations: CITATIONS,
        searchCount: 5,
      });
      throw new Phase1Error('provider_error', 'died after a failed checkpoint');
    });

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(lastRpc(harness)).toMatchObject({
      p_status: 'failed',
      p_generation_error: 'provider_error',
    });
  });

  it('never runs phase 2 after a truncation, and applies the floor rule', async () => {
    const long = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, { resolve: { outcome: 'truncated' } }));
    await runResearch(long.admin, RESEARCH_ID, IDEA);
    expect(callForcedToolMock).not.toHaveBeenCalled();
    expect(lastRpc(long)).toMatchObject({ p_status: 'partial', p_generation_error: 'truncated' });

    const short = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(SHORT_FINDINGS, { resolve: { outcome: 'truncated' } }));
    await runResearch(short.admin, RESEARCH_ID, IDEA);
    expect(callForcedToolMock).not.toHaveBeenCalled();
    expect(lastRpc(short)).toMatchObject({ p_status: 'failed', p_generation_error: 'truncated' });
  });

  // Regression guard for the review's critical finding: an "ok" phase 1 that
  // produced no usable synthesis must never reach phase 2, because a forced-tool
  // call would invent a report and a 'completed' finalize would then rewrite the
  // idea's grade from a run that read nothing.
  it('refuses to run phase 2 on empty findings, even with citations', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1('', { resolve: { citations: CITATIONS } }));

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(callForcedToolMock).not.toHaveBeenCalled();
    expect(lastRpc(harness)).toMatchObject({
      p_status: 'failed',
      p_generation_error: 'search_failed',
    });
  });

  it('refuses to run phase 2 on sub-floor findings', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(SHORT_FINDINGS, { resolve: { citations: CITATIONS } }));

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(callForcedToolMock).not.toHaveBeenCalled();
    expect(lastRpc(harness)).toMatchObject({
      p_status: 'failed',
      p_generation_error: 'search_failed',
    });
  });

  it('finalizes no_citations without spending on phase 2', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, { resolve: { citations: [] } }));
    await runResearch(harness.admin, RESEARCH_ID, IDEA);
    expect(callForcedToolMock).not.toHaveBeenCalled();
    expect(lastRpc(harness)).toMatchObject({
      p_status: 'partial',
      p_generation_error: 'no_citations',
    });
  });

  it('turns any phase-2 failure into partial structuring_failed', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));
    callForcedToolMock.mockRejectedValue(new BlueFillerProviderError('phase 2 died'));

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(lastRpc(harness)).toMatchObject({
      p_status: 'partial',
      p_generation_error: 'structuring_failed',
    });
    expect(lastRpc(harness).p_model_id).toBe(RESEARCH_MODEL_ID);
    expect(lastRpc(harness).p_pipeline_version).toBe(BF_PIPELINE_VERSION);
  });

  it('turns schema-invalid phase-2 output into partial structuring_failed', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));
    callForcedToolMock.mockResolvedValue({ report: REPORT, revised_scores: { gap: 99 } });

    await runResearch(harness.admin, RESEARCH_ID, IDEA);

    expect(lastRpc(harness)).toMatchObject({
      p_status: 'partial',
      p_generation_error: 'structuring_failed',
    });
  });

  // The phase-1 half of the plan's provider-error table.
  const PHASE1_CODES = ['timeout', 'provider_error', 'search_failed'] as const;

  it.each(PHASE1_CODES)(
    'maps a phase-1 %s to partial when findings are usable',
    async (code) => {
      const harness = makeAdmin();
      runPhase1Mock.mockImplementation(
        phase1(LONG_FINDINGS, { reject: new Phase1Error(code, 'boom') }),
      );
      await runResearch(harness.admin, RESEARCH_ID, IDEA);
      expect(lastRpc(harness)).toMatchObject({ p_status: 'partial', p_generation_error: code });
    },
  );

  it.each(PHASE1_CODES)(
    'maps a phase-1 %s to failed when nothing usable was checkpointed',
    async (code) => {
      const harness = makeAdmin();
      runPhase1Mock.mockImplementation(phase1('', { reject: new Phase1Error(code, 'boom') }));
      await runResearch(harness.admin, RESEARCH_ID, IDEA);
      expect(lastRpc(harness)).toMatchObject({ p_status: 'failed', p_generation_error: code });
    },
  );

  it('treats sub-floor findings as NOT usable', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(
      phase1(SHORT_FINDINGS, { reject: new Phase1Error('timeout', 'boom') }),
    );
    await runResearch(harness.admin, RESEARCH_ID, IDEA);
    expect(lastRpc(harness)).toMatchObject({ p_status: 'failed', p_generation_error: 'timeout' });
  });

  it('maps an unclassified exception to internal', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, { reject: new Error('surprise') }));
    await runResearch(harness.admin, RESEARCH_ID, IDEA);
    expect(lastRpc(harness)).toMatchObject({ p_status: 'partial', p_generation_error: 'internal' });
  });

  it('omits model provenance on a failed row (the stale-flipper cannot know it)', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(
      phase1('', { reject: new Phase1Error('search_failed', 'boom') }),
    );
    await runResearch(harness.admin, RESEARCH_ID, IDEA);
    expect(lastRpc(harness).p_model_id).toBeNull();
    expect(lastRpc(harness).p_pipeline_version).toBeNull();
  });

  it('swallows an RPC failure — the row stale-flips instead', async () => {
    const harness = makeAdmin();
    harness.setRpcResult({ data: null, error: { message: 'rpc exploded' } });
    runPhase1Mock.mockImplementation(phase1(LONG_FINDINGS, {}));
    await expect(runResearch(harness.admin, RESEARCH_ID, IDEA)).resolves.toBeUndefined();
  });

  it('never lets a raw provider message reach the DB', async () => {
    const harness = makeAdmin();
    runPhase1Mock.mockImplementation(
      phase1(LONG_FINDINGS, {
        reject: new Phase1Error('provider_error', 'sk-ant-secret leaked in the body'),
      }),
    );
    await runResearch(harness.admin, RESEARCH_ID, IDEA);
    expect(JSON.stringify(harness.rpcCalls)).not.toContain('sk-ant-secret');
    expect(JSON.stringify(harness.updates)).not.toContain('sk-ant-secret');
  });
});

describe('buildResearchSummaryMd', () => {
  it('is built in code from the report, with every section and the sources', () => {
    const summary = buildResearchSummaryMd(REPORT, CITATIONS, 7);
    expect(summary).toContain('## Market reality');
    expect(summary).toContain('## Adoption evidence');
    expect(summary).toContain('## Competitor landscape');
    expect(summary).toContain('## Acquirer signals');
    expect(summary).toContain('## Risks');
    expect(summary).toContain('## Score rationale');
    expect(summary).toContain('[A](https://a.example/x)');
    expect(summary).toContain('7 web searches, 1 source');
  });

  it('singularizes a single search', () => {
    expect(buildResearchSummaryMd(REPORT, CITATIONS, 1)).toContain('1 web search, 1 source');
  });
});
