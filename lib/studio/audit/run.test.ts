import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const { fetchAuditPagesMock, fetchPsiMock, computeMock, genMock } = vi.hoisted(() => ({
  fetchAuditPagesMock: vi.fn(),
  fetchPsiMock: vi.fn(),
  computeMock: vi.fn(),
  genMock: vi.fn(),
}));
vi.mock('./crawl', () => ({ fetchAuditPages: fetchAuditPagesMock }));
vi.mock('./psi', () => ({ fetchPsiWithRetry: fetchPsiMock }));
vi.mock('./heuristics', () => ({ computeHeuristics: computeMock }));
vi.mock('./summary', () => ({ buildSummaryMd: () => 'SUMMARY' }));
vi.mock('./generator', () => ({ generateAuditNarrative: genMock, AUDIT_MODEL_ID: 'claude-sonnet-5' }));

import { runAudit, type AuditLeadContext } from './run';

const HEUR = {
  scores: {
    overall: 50,
    categories: { security: 50, seo: 50, mobile: 50, conversion: 50, freshness: 50, accessibility: 50 },
  },
  findings: [],
  tech: {
    generator: null,
    cms: null,
    builders: [],
    jquery: null,
    copyrightYear: null,
    pagesFetched: 1,
    finalUrl: 'https://x.example/',
  },
};

const VALID_NARRATIVE = {
  one_liner: 'x',
  current_state_md: 'x',
  opportunities_md: 'x',
  competitive_md: 'x',
  next_steps_md: 'x',
};

const LEAD: AuditLeadContext = { leadId: 'L', company: 'Acme', industry: null, url: 'https://x.example/' };

interface Chain {
  eq: () => Chain;
  lt: () => Chain;
  select: () => Promise<{ data: unknown; error: unknown }>;
}

// Admin mock: every state-changing write is update().eq().eq().select(). Each
// update() consumes the next configured result and records its patch.
function makeAdmin(results: Array<{ data: unknown; error: unknown }>) {
  const patches: Record<string, unknown>[] = [];
  let i = 0;
  const from = () => ({
    update: (patch: Record<string, unknown>) => {
      patches.push(patch);
      const res = results[Math.min(i, results.length - 1)];
      i += 1;
      const chain: Chain = {
        eq: () => chain,
        lt: () => chain,
        select: async () => res,
      };
      return chain;
    },
  });
  return { admin: { from } as unknown as SupabaseClient, patches, writes: () => i };
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchAuditPagesMock.mockResolvedValue([
    { url: 'https://x.example/', finalUrl: 'https://x.example/', html: '<html></html>' },
  ]);
  fetchPsiMock.mockResolvedValue(null);
  computeMock.mockReturnValue(HEUR);
  genMock.mockResolvedValue(VALID_NARRATIVE);
});

describe('runAudit', () => {
  it('completes cleanly: persist then finalize(completed) with the narrative', async () => {
    const { admin, patches } = makeAdmin([
      { data: [{ id: 'a' }], error: null }, // persist scores
      { data: [{ id: 'a' }], error: null }, // finalize completed
    ]);
    await runAudit(admin, 'a', LEAD);
    expect(genMock).toHaveBeenCalledTimes(1);
    expect(patches).toHaveLength(2);
    expect(patches[1].status).toBe('completed');
    expect(patches[1].narrative).toEqual(VALID_NARRATIVE);
    expect(patches[1].summary_md).toBe('SUMMARY');
    expect(patches[1].completed_at).toBeTruthy();
    expect(patches[1].model_id).toBe('claude-sonnet-5');
  });

  it('aborts without calling Claude when the persist write is fenced (0 rows)', async () => {
    const { admin, patches, writes } = makeAdmin([{ data: [], error: null }]); // fenced
    await runAudit(admin, 'a', LEAD);
    expect(genMock).not.toHaveBeenCalled();
    expect(writes()).toBe(1); // only the persist attempt; no overwrite after
    expect(patches).toHaveLength(1);
  });

  it('aborts and does not falsely complete when the persist write errors', async () => {
    const { admin, patches } = makeAdmin([{ data: null, error: { message: 'boom' } }]);
    await runAudit(admin, 'a', LEAD);
    expect(genMock).not.toHaveBeenCalled();
    expect(patches).toHaveLength(1);
    expect(patches[0].status).toBeUndefined(); // the errored write never set a terminal status
  });

  it('marks partial with a safe code when the narrative throws', async () => {
    genMock.mockRejectedValue(new Error('anthropic down'));
    const { admin, patches } = makeAdmin([
      { data: [{ id: 'a' }], error: null }, // persist
      { data: [{ id: 'a' }], error: null }, // finalize partial
    ]);
    await runAudit(admin, 'a', LEAD);
    expect(patches[1].status).toBe('partial');
    expect(patches[1].generation_error).toBe('narrative_failed');
    expect(patches[1].summary_md).toBe('SUMMARY');
  });

  it('marks failed(unreachable) when the homepage is unfetchable', async () => {
    fetchAuditPagesMock.mockResolvedValue([]);
    const { admin, patches } = makeAdmin([{ data: [{ id: 'a' }], error: null }]);
    await runAudit(admin, 'a', LEAD);
    expect(genMock).not.toHaveBeenCalled();
    expect(patches[0].status).toBe('failed');
    expect(patches[0].generation_error).toBe('unreachable');
  });

  it('maps a TimeoutError to a safe "timeout" code', async () => {
    fetchAuditPagesMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    const { admin, patches } = makeAdmin([{ data: [{ id: 'a' }], error: null }]);
    await runAudit(admin, 'a', LEAD);
    expect(patches[0].status).toBe('failed');
    expect(patches[0].generation_error).toBe('timeout');
  });
});
