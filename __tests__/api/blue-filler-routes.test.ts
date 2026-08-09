import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  getUserMock,
  userRoleMock,
  ideaSelectMock,
  ideaInsertMock,
  ideaInsertSingleMock,
  ideaUpdateEqMock,
  researchInsertSingleMock,
  generateIdeaMock,
  generateKillMemoMock,
  getTasteProfileMock,
  getDedupeListMock,
  getLatestResearchForPollMock,
  getResearchHistoryMock,
  flipStaleResearchMock,
  runResearchMock,
  afterCbs,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  userRoleMock: vi.fn(),
  ideaSelectMock: vi.fn(),
  ideaInsertMock: vi.fn(),
  ideaInsertSingleMock: vi.fn(),
  ideaUpdateEqMock: vi.fn(),
  researchInsertSingleMock: vi.fn(),
  generateIdeaMock: vi.fn(),
  generateKillMemoMock: vi.fn(),
  getTasteProfileMock: vi.fn(),
  getDedupeListMock: vi.fn(),
  getLatestResearchForPollMock: vi.fn(),
  getResearchHistoryMock: vi.fn(),
  flipStaleResearchMock: vi.fn(),
  runResearchMock: vi.fn(),
  afterCbs: [] as Array<() => unknown>,
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (cb: () => unknown) => afterCbs.push(cb) };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: userRoleMock }) }) };
      }
      throw new Error(`Unexpected user-client table: ${table}`);
    },
  }),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'blue_filler_ideas') {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => ({
              maybeSingle: () => ideaSelectMock(column, value),
            }),
          }),
          insert: ideaInsertMock,
          update: (patch: Record<string, unknown>) => ({
            eq: (column: string, value: unknown) => ideaUpdateEqMock(patch, column, value),
          }),
        };
      }
      if (table === 'blue_filler_research') {
        return {
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({ single: () => researchInsertSingleMock(payload) }),
          }),
        };
      }
      throw new Error(`Unexpected admin table: ${table}`);
    },
  }),
}));

vi.mock('@/lib/blue-filler/generator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/blue-filler/generator')>();
  return { ...actual, generateIdea: generateIdeaMock, generateKillMemo: generateKillMemoMock };
});

vi.mock('@/lib/blue-filler/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/blue-filler/queries')>();
  return {
    ...actual,
    getTasteProfile: getTasteProfileMock,
    getDedupeList: getDedupeListMock,
    getLatestResearchForPoll: getLatestResearchForPollMock,
    getResearchHistory: getResearchHistoryMock,
  };
});

vi.mock('@/lib/blue-filler/research/run', () => ({
  flipStaleResearch: flipStaleResearchMock,
  runResearch: runResearchMock,
}));

import { POST as generatePOST } from '@/app/api/admin/blue-filler/generate/route';
import { POST as killMemoPOST } from '@/app/api/admin/blue-filler/ideas/[id]/kill-memo/route';
import {
  GET as researchGET,
  POST as researchPOST,
} from '@/app/api/admin/blue-filler/ideas/[id]/research/route';
import { BlueFillerProviderError } from '@/lib/blue-filler/generator';

const IDEA_ID = '11111111-1111-1111-1111-111111111111';
const REQUEST_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const GENERATED = {
  title: 'Denial Desk',
  one_liner: 'AI appeals for clinic denial queues.',
  summary_md: 'pitch',
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
    acquirer_hypothesis: ['RCM consolidators'],
  },
  scores: { gap: 9, market: 7, fit: 7, speed: 6, moat: 5, exit: 6 },
  industry_key: 'healthcare-rev-cycle',
};

const STORED_IDEA = { id: IDEA_ID, status: 'new', title: 'Denial Desk' };

function generateReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/blue-filler/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function idReq(path: string, id: string, method = 'POST', query = '') {
  return {
    req: new NextRequest(`http://localhost/api/admin/blue-filler/ideas/${id}/${path}${query}`, {
      method,
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

const unique23505 = { code: '23505', message: 'duplicate key value violates unique constraint' };

beforeEach(() => {
  vi.clearAllMocks();
  afterCbs.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});

  getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  userRoleMock.mockResolvedValue({ data: { role: 'admin' } });

  ideaSelectMock.mockResolvedValue({ data: null });
  ideaInsertMock.mockImplementation((payload: Record<string, unknown>) => ({
    select: () => ({ single: () => ideaInsertSingleMock(payload) }),
  }));
  ideaInsertSingleMock.mockResolvedValue({ data: STORED_IDEA, error: null });
  ideaUpdateEqMock.mockResolvedValue({ error: null });
  researchInsertSingleMock.mockResolvedValue({ data: { id: 'research-1' }, error: null });

  generateIdeaMock.mockResolvedValue(GENERATED);
  getTasteProfileMock.mockResolvedValue({ interested: [], passed: [] });
  getDedupeListMock.mockResolvedValue([]);
  flipStaleResearchMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// POST /generate
// ---------------------------------------------------------------------------

describe('POST /generate — gate and validation', () => {
  it('401s a signed-out request', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect((await generatePOST(generateReq({ request_id: REQUEST_ID }))).status).toBe(401);
  });

  it('403s a non-admin', async () => {
    userRoleMock.mockResolvedValue({ data: { role: 'student' } });
    expect((await generatePOST(generateReq({ request_id: REQUEST_ID }))).status).toBe(403);
  });

  it('400s an unparseable body', async () => {
    const req = new NextRequest('http://localhost/api/admin/blue-filler/generate', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await generatePOST(req)).status).toBe(400);
  });

  it('400s a bad request_id, an unknown industry_key and an unknown field', async () => {
    expect((await generatePOST(generateReq({ request_id: 'nope' }))).status).toBe(400);
    expect(
      (await generatePOST(generateReq({ request_id: REQUEST_ID, industry_key: 'crypto' }))).status,
    ).toBe(400);
    expect(
      (await generatePOST(generateReq({ request_id: REQUEST_ID, force_grade: 'A' }))).status,
    ).toBe(400);
  });

  it('400s a seed that is too short, without spending on the provider', async () => {
    const res = await generatePOST(
      generateReq({ request_id: REQUEST_ID, source_text: 'too short' }),
    );
    expect(res.status).toBe(400);
    expect(generateIdeaMock).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only seed as absent', async () => {
    const res = await generatePOST(generateReq({ request_id: REQUEST_ID, source_text: '   ' }));
    expect(res.status).toBe(200);
    expect(ideaInsertMock.mock.calls[0][0].origin).toBe('cold');
  });
});

describe('POST /generate — idempotency', () => {
  it('short-circuits a repeat submit with ZERO provider spend', async () => {
    ideaSelectMock.mockResolvedValue({ data: STORED_IDEA });
    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ idea: STORED_IDEA });
    expect(generateIdeaMock).not.toHaveBeenCalled();
    expect(ideaInsertMock).not.toHaveBeenCalled();
  });

  it('returns the twin when a 23505 turns out to be the request_id', async () => {
    ideaSelectMock
      .mockResolvedValueOnce({ data: null }) // pre-call lookup
      .mockResolvedValueOnce({ data: STORED_IDEA }); // post-23505 lookup
    ideaInsertSingleMock.mockResolvedValueOnce({ data: null, error: unique23505 });

    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ idea: STORED_IDEA });
    expect(ideaInsertMock).toHaveBeenCalledTimes(1);
  });

  it('retries a NEW slug when the 23505 was not the request_id', async () => {
    ideaInsertSingleMock
      .mockResolvedValueOnce({ data: null, error: unique23505 })
      .mockResolvedValueOnce({ data: STORED_IDEA, error: null });

    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));

    expect(res.status).toBe(200);
    expect(ideaInsertMock).toHaveBeenCalledTimes(2);
    const first = ideaInsertMock.mock.calls[0][0].slug as string;
    const second = ideaInsertMock.mock.calls[1][0].slug as string;
    expect(first).toBe('denial-desk');
    expect(second).not.toBe(first);
    expect(second.startsWith('denial-desk-')).toBe(true);
    expect(second).toMatch(/^[a-z0-9-]{4,66}$/);
  });

  it('terminates on a repeated 23505: re-lookup, then 500 — never a loop', async () => {
    ideaInsertSingleMock.mockResolvedValue({ data: null, error: unique23505 });

    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));

    expect(res.status).toBe(500);
    // Three bounded attempts, each followed by a request_id re-check.
    expect(ideaInsertMock).toHaveBeenCalledTimes(3);
    expect(ideaSelectMock).toHaveBeenCalledTimes(4);
    const slugs = ideaInsertMock.mock.calls.map((call) => call[0].slug);
    expect(new Set(slugs).size).toBe(3);
  });

  it('returns the twin if it appears only on the LAST re-lookup', async () => {
    ideaInsertSingleMock.mockResolvedValue({ data: null, error: unique23505 });
    ideaSelectMock
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: STORED_IDEA });

    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ idea: STORED_IDEA });
  });

  it('500s rather than double-spending when the pre-call lookup itself fails', async () => {
    // A transient SELECT error must NOT be read as "no existing idea" — that
    // would turn a DB blip into a second paid generation.
    ideaSelectMock.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(res.status).toBe(500);
    expect(generateIdeaMock).not.toHaveBeenCalled();
    expect(ideaInsertMock).not.toHaveBeenCalled();
  });

  it('500s when the post-23505 twin lookup fails, instead of retrying a slug', async () => {
    ideaSelectMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    ideaInsertSingleMock.mockResolvedValueOnce({ data: null, error: unique23505 });

    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(res.status).toBe(500);
    expect(ideaInsertMock).toHaveBeenCalledTimes(1);
  });

  it('500s a non-23505 insert error without retrying', async () => {
    ideaInsertSingleMock.mockResolvedValue({ data: null, error: { code: '23503' } });
    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(res.status).toBe(500);
    expect(ideaInsertMock).toHaveBeenCalledTimes(1);
  });
});

describe('POST /generate — the row it writes', () => {
  it('computes composite, grade and exit math in code, and mirrors gen into current', async () => {
    await generatePOST(generateReq({ request_id: REQUEST_ID }));
    const row = ideaInsertMock.mock.calls[0][0];

    // gap 9 -> 225, others (7+7+6+5+6=31) -> 465; 690 / 10 = 69 -> B
    expect(row.composite).toBe(69);
    expect(row.grade).toBe('B');
    expect(row.gen_scores).toEqual(GENERATED.scores);
    expect(row.current_scores).toEqual(GENERATED.scores);
    expect(row.thesis.exit_math).toEqual({ needed_arr_usd: 6_250_000, customers_needed: 652 });
    expect(row.thesis.exit_in_thesis_band).toBe(true);
    expect(row.slug).toBe('denial-desk');
    expect(row.request_id).toBe(REQUEST_ID);
    expect(row.pipeline_version).toBe('bf-pipeline-v1');
    expect(row.model_id).toBe('claude-sonnet-5');
  });

  it('flags an out-of-thesis-band target rather than hiding it', async () => {
    generateIdeaMock.mockResolvedValue({
      ...GENERATED,
      thesis: {
        ...GENERATED.thesis,
        exit_assumptions: { ...GENERATED.thesis.exit_assumptions, target_exit_usd: 60_000_000 },
      },
    });
    await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(ideaInsertMock.mock.calls[0][0].thesis.exit_in_thesis_band).toBe(false);
  });

  it('stores build_sha from VERCEL_GIT_COMMIT_SHA when present', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'deadbeefcafe');
    await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(ideaInsertMock.mock.calls[0][0].build_sha).toBe('deadbeefcafe');
  });

  it('stores a null build_sha in local dev', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
    await generatePOST(generateReq({ request_id: REQUEST_ID }));
    expect(ideaInsertMock.mock.calls[0][0].build_sha ?? null).toBeFalsy();
  });

  it('applies the origin precedence and caps the stored excerpt', async () => {
    const seed = 'S'.repeat(3000);
    await generatePOST(
      generateReq({ request_id: REQUEST_ID, mode: 'acquirer', source_text: seed }),
    );
    const row = ideaInsertMock.mock.calls[0][0];
    expect(row.origin).toBe('seeded');
    expect((row.source_excerpt as string).length).toBe(2000);

    ideaInsertMock.mockClear();
    await generatePOST(generateReq({ request_id: REQUEST_ID, mode: 'acquirer' }));
    expect(ideaInsertMock.mock.calls[0][0].origin).toBe('acquirer');
  });
});

describe('POST /generate — provider failures', () => {
  it('502s a provider error with a curated message and no raw content', async () => {
    generateIdeaMock.mockRejectedValue(
      new BlueFillerProviderError('Claude API error 500 — sk-ant-leak'),
    );
    const res = await generatePOST(generateReq({ request_id: REQUEST_ID }));
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain('sk-ant-leak');
    expect(body.error).toMatch(/try again/i);
  });

  it('500s an unclassified error', async () => {
    generateIdeaMock.mockRejectedValue(new Error('something else'));
    expect((await generatePOST(generateReq({ request_id: REQUEST_ID }))).status).toBe(500);
  });

  it('502s when the model returns exit assumptions the math rejects', async () => {
    generateIdeaMock.mockResolvedValue({
      ...GENERATED,
      thesis: {
        ...GENERATED.thesis,
        exit_assumptions: { ...GENERATED.thesis.exit_assumptions, assumed_multiple: 0 },
      },
    });
    expect((await generatePOST(generateReq({ request_id: REQUEST_ID }))).status).toBe(502);
    expect(ideaInsertMock).not.toHaveBeenCalled();
  });
});

describe('POST /generate — concurrent same-request_id race', () => {
  it('resolves BOTH callers to the same idea with exactly one row inserted', async () => {
    // Both callers pass the pre-call lookup (nothing stored yet), so both enter
    // generation. A barrier holds them there until both are inside.
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered = 0;
    generateIdeaMock.mockImplementation(async () => {
      entered += 1;
      if (entered === 2) release();
      await barrier;
      return GENERATED;
    });

    // Insert: the first caller wins; the second gets a 23505 on request_id.
    let inserts = 0;
    ideaInsertSingleMock.mockImplementation(async () => {
      inserts += 1;
      return inserts === 1
        ? { data: STORED_IDEA, error: null }
        : { data: null, error: unique23505 };
    });

    // The pre-call lookups both miss; any lookup after the winner's insert hits.
    ideaSelectMock.mockImplementation(async () =>
      inserts >= 1 ? { data: STORED_IDEA } : { data: null },
    );

    const [resA, resB] = await Promise.all([
      generatePOST(generateReq({ request_id: REQUEST_ID })),
      generatePOST(generateReq({ request_id: REQUEST_ID })),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);
    expect(bodyA.idea.id).toBe(IDEA_ID);
    expect(bodyB.idea.id).toBe(bodyA.idea.id);

    // Both invoked the provider (the accepted duplicate-spend risk) but exactly
    // one row was actually created.
    expect(entered).toBe(2);
    expect(inserts).toBe(2);
    expect(ideaInsertMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// POST /ideas/[id]/kill-memo
// ---------------------------------------------------------------------------

const KILL_MEMO = {
  fatal_flaws: ['a', 'b'],
  strongest_counterargument: 'c',
  cheapest_disproof: 'd',
  verdict_lean: 'kill',
  memo_md: '# memo',
};

describe('POST /kill-memo', () => {
  beforeEach(() => {
    ideaSelectMock.mockResolvedValue({ data: STORED_IDEA });
    generateKillMemoMock.mockResolvedValue(KILL_MEMO);
  });

  it('401s, 403s and 400s before touching the provider', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { req, ctx } = idReq('kill-memo', IDEA_ID);
    expect((await killMemoPOST(req, ctx)).status).toBe(401);

    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    userRoleMock.mockResolvedValue({ data: { role: 'student' } });
    const second = idReq('kill-memo', IDEA_ID);
    expect((await killMemoPOST(second.req, second.ctx)).status).toBe(403);

    userRoleMock.mockResolvedValue({ data: { role: 'admin' } });
    const third = idReq('kill-memo', 'not-a-uuid');
    expect((await killMemoPOST(third.req, third.ctx)).status).toBe(400);

    expect(generateKillMemoMock).not.toHaveBeenCalled();
  });

  it('404s an unknown idea', async () => {
    ideaSelectMock.mockResolvedValue({ data: null });
    const { req, ctx } = idReq('kill-memo', IDEA_ID);
    expect((await killMemoPOST(req, ctx)).status).toBe(404);
  });

  it('409s an archived idea without spending', async () => {
    ideaSelectMock.mockResolvedValue({ data: { ...STORED_IDEA, status: 'archived' } });
    const { req, ctx } = idReq('kill-memo', IDEA_ID);
    expect((await killMemoPOST(req, ctx)).status).toBe(409);
    expect(generateKillMemoMock).not.toHaveBeenCalled();
  });

  it('stamps model_id and pipeline_version inside the stored jsonb', async () => {
    const { req, ctx } = idReq('kill-memo', IDEA_ID);
    const res = await killMemoPOST(req, ctx);
    expect(res.status).toBe(200);

    const patch = ideaUpdateEqMock.mock.calls[0][0];
    expect(patch.kill_memo).toMatchObject({
      ...KILL_MEMO,
      model_id: 'claude-sonnet-5',
      pipeline_version: 'bf-pipeline-v1',
    });
    expect(patch.kill_memo.generated_at).toBeTruthy();
    expect(patch.updated_at).toBeTruthy();
  });

  it('502s a provider failure and writes NOTHING (success-only overwrite)', async () => {
    generateKillMemoMock.mockRejectedValue(new BlueFillerProviderError('boom sk-ant-leak'));
    const { req, ctx } = idReq('kill-memo', IDEA_ID);
    const res = await killMemoPOST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(ideaUpdateEqMock).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('sk-ant-leak');
    expect(body.error).toMatch(/previous memo is unchanged/i);
  });

  it('500s a save failure', async () => {
    ideaUpdateEqMock.mockResolvedValue({ error: { message: 'db down' } });
    const { req, ctx } = idReq('kill-memo', IDEA_ID);
    expect((await killMemoPOST(req, ctx)).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// /ideas/[id]/research
// ---------------------------------------------------------------------------

describe('POST /research', () => {
  beforeEach(() => {
    ideaSelectMock.mockResolvedValue({ data: STORED_IDEA });
  });

  it('401s, 403s and 400s', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const a = idReq('research', IDEA_ID);
    expect((await researchPOST(a.req, a.ctx)).status).toBe(401);

    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    userRoleMock.mockResolvedValue({ data: { role: 'student' } });
    const b = idReq('research', IDEA_ID);
    expect((await researchPOST(b.req, b.ctx)).status).toBe(403);

    userRoleMock.mockResolvedValue({ data: { role: 'admin' } });
    const c = idReq('research', 'not-a-uuid');
    expect((await researchPOST(c.req, c.ctx)).status).toBe(400);
  });

  it('404s an unknown idea and 409s an archived one', async () => {
    ideaSelectMock.mockResolvedValue({ data: null });
    const a = idReq('research', IDEA_ID);
    expect((await researchPOST(a.req, a.ctx)).status).toBe(404);

    ideaSelectMock.mockResolvedValue({ data: { ...STORED_IDEA, status: 'archived' } });
    const b = idReq('research', IDEA_ID);
    expect((await researchPOST(b.req, b.ctx)).status).toBe(409);
    expect(afterCbs).toHaveLength(0);
  });

  it('clears zombies, inserts a generating row with build_sha, and 202s', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'sha-123');
    const { req, ctx } = idReq('research', IDEA_ID);
    const res = await researchPOST(req, ctx);

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ researchId: 'research-1' });
    expect(flipStaleResearchMock).toHaveBeenCalledWith(expect.anything(), IDEA_ID);
    expect(researchInsertSingleMock.mock.calls[0][0]).toMatchObject({
      idea_id: IDEA_ID,
      status: 'generating',
      build_sha: 'sha-123',
    });
    expect(afterCbs).toHaveLength(1);

    afterCbs[0]();
    expect(runResearchMock).toHaveBeenCalledWith(expect.anything(), 'research-1', STORED_IDEA);
  });

  it('409s a concurrent double-POST via the partial unique index', async () => {
    researchInsertSingleMock.mockResolvedValue({ data: null, error: unique23505 });
    const { req, ctx } = idReq('research', IDEA_ID);
    const res = await researchPOST(req, ctx);
    expect(res.status).toBe(409);
    expect(afterCbs).toHaveLength(0);
  });

  it('500s any other insert error', async () => {
    researchInsertSingleMock.mockResolvedValue({ data: null, error: { code: '23503' } });
    const { req, ctx } = idReq('research', IDEA_ID);
    expect((await researchPOST(req, ctx)).status).toBe(500);
  });
});

describe('GET /research', () => {
  beforeEach(() => {
    ideaSelectMock.mockResolvedValue({ data: { id: IDEA_ID } });
    getLatestResearchForPollMock.mockResolvedValue({ id: 'research-1', status: 'generating' });
    getResearchHistoryMock.mockResolvedValue([
      {
        id: 'research-1',
        created_at: '2026-08-08T00:00:00Z',
        status: 'completed',
        search_count: 5,
        citations: [{ url: 'https://a.example', title: 'A', cited_text: 'q' }],
      },
    ]);
  });

  it('gates and validates like POST', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const a = idReq('research', IDEA_ID, 'GET');
    expect((await researchGET(a.req, a.ctx)).status).toBe(401);

    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    const b = idReq('research', 'not-a-uuid', 'GET');
    expect((await researchGET(b.req, b.ctx)).status).toBe(400);

    ideaSelectMock.mockResolvedValue({ data: null });
    const c = idReq('research', IDEA_ID, 'GET');
    expect((await researchGET(c.req, c.ctx)).status).toBe(404);
  });

  it('returns only { latest } when polling, via the narrow projection', async () => {
    const { req, ctx } = idReq('research', IDEA_ID, 'GET', '?poll=1');
    const body = await (await researchGET(req, ctx)).json();
    expect(body).toEqual({ latest: { id: 'research-1', status: 'generating' } });
    // The poll must never load raw_findings_md (DB-capped at 200k chars) or the
    // full history — it fires every 5s for the length of the run.
    expect(getLatestResearchForPollMock).toHaveBeenCalledWith(IDEA_ID);
    expect(getResearchHistoryMock).not.toHaveBeenCalled();
  });

  it('returns latest + summarized history otherwise, flipping zombies first', async () => {
    const { req, ctx } = idReq('research', IDEA_ID, 'GET');
    const body = await (await researchGET(req, ctx)).json();
    expect(flipStaleResearchMock).toHaveBeenCalledWith(expect.anything(), IDEA_ID);
    expect(body.latest.id).toBe('research-1');
    expect(body.history).toEqual([
      {
        id: 'research-1',
        created_at: '2026-08-08T00:00:00Z',
        status: 'completed',
        search_count: 5,
        citation_count: 1,
      },
    ]);
  });

  it('500s a read failure rather than returning an empty list', async () => {
    getResearchHistoryMock.mockRejectedValue(new Error('db down'));
    const { req, ctx } = idReq('research', IDEA_ID, 'GET');
    const res = await researchGET(req, ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load research.' });
  });
});
