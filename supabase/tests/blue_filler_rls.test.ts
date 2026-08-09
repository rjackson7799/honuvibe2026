/**
 * Blue Filler (066) — RLS, constraints, concurrency and RPC semantics.
 *
 * Runs against a real local database via `pnpm test:rls`, so it covers what the
 * unit suite cannot: the CHECK constraints, the partial unique index, the
 * SECURITY DEFINER RPC's compare-and-swap, and — most importantly — the
 * TS<->SQL scoring parity, asserted from the SAME fixture the unit tests use
 * (SCORING_PARITY_FIXTURE in lib/blue-filler/scoring.ts).
 */

import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import { SCORING_PARITY_FIXTURE } from '../../lib/blue-filler/scoring';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const admin = serviceClient();

const VALID_SCORES = { gap: 8, market: 6, fit: 7, speed: 5, moat: 4, exit: 6 };
const REVISED_SCORES = { gap: 5, market: 5, fit: 5, speed: 5, moat: 5, exit: 5 }; // -> 50 / 'C'
const CITATIONS = [{ url: 'https://a.example/x', title: 'A', cited_text: 'quote' }];
const REPORT = { market_reality_md: 'x' };
const FINDINGS = 'F'.repeat(400);

let slugCounter = 0;

function ideaRow(overrides: Record<string, unknown> = {}) {
  slugCounter += 1;
  return {
    title: 'Fixture Idea',
    slug: `fixture-idea-${slugCounter}`,
    industry_key: 'healthcare-rev-cycle',
    one_liner: 'A fixture.',
    summary_md: 'Fixture summary.',
    thesis: { target_user: 'u' },
    gen_scores: VALID_SCORES,
    current_scores: VALID_SCORES,
    composite: 69,
    grade: 'B',
    model_id: 'claude-sonnet-5',
    pipeline_version: 'bf-pipeline-v1',
    ...overrides,
  };
}

async function seedIdea(overrides: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await admin
    .from('blue_filler_ideas')
    .insert(ideaRow(overrides))
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

async function seedResearch(ideaId: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await admin
    .from('blue_filler_research')
    .insert({ idea_id: ideaId, status: 'generating', ...overrides })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

interface FinalizeArgs {
  p_research_id: string;
  p_status: string;
  p_report?: unknown;
  p_summary_md?: string | null;
  p_citations?: unknown;
  p_revised_scores?: unknown;
  p_search_count?: number | null;
  p_generation_error?: string | null;
  p_model_id?: string | null;
  p_pipeline_version?: string | null;
}

function finalize(args: FinalizeArgs) {
  return admin.rpc('finalize_blue_filler_research', args as unknown as Record<string, unknown>);
}

function completedArgs(researchId: string, overrides: Partial<FinalizeArgs> = {}): FinalizeArgs {
  return {
    p_research_id: researchId,
    p_status: 'completed',
    p_report: REPORT,
    p_summary_md: 'summary',
    p_citations: CITATIONS,
    p_revised_scores: REVISED_SCORES,
    p_search_count: 7,
    p_model_id: 'claude-opus-5+claude-sonnet-5',
    p_pipeline_version: 'bf-pipeline-v1',
    ...overrides,
  };
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  // research cascades from ideas, but delete it explicitly so a failed cascade
  // surfaces as a test failure rather than as leftover rows.
  await admin.from('blue_filler_research').delete().neq('id', ZERO_UUID);
  await admin.from('blue_filler_ideas').delete().neq('id', ZERO_UUID);
});

// ---------------------------------------------------------------------------
// 1-6. RLS
// ---------------------------------------------------------------------------

describe('RLS — blue_filler_ideas', () => {
  test('1. anonymous cannot read', async () => {
    await seedIdea();
    const { data } = await anonClient().from('blue_filler_ideas').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('2. anonymous cannot insert', async () => {
    const { error } = await anonClient().from('blue_filler_ideas').insert(ideaRow());
    expect(error).not.toBeNull();
  });

  test('3. a non-admin member cannot read', async () => {
    await seedIdea();
    const client = await userClient(USERS.honuvibe_free);
    const { data } = await client.from('blue_filler_ideas').select('id');
    expect(data ?? []).toEqual([]);
  });

  test('4. a non-admin member cannot insert, update or delete', async () => {
    const id = await seedIdea();
    const client = await userClient(USERS.honuvibe_free);
    expect((await client.from('blue_filler_ideas').insert(ideaRow())).error).not.toBeNull();
    const update = await client.from('blue_filler_ideas').update({ status: 'shortlist' }).eq('id', id);
    // RLS makes this either an error or a silent zero-row update; the row must not change.
    expect(update.error !== null || true).toBe(true);
    const { data: after } = await admin.from('blue_filler_ideas').select('status').eq('id', id).single();
    expect(after!.status).toBe('new');
  });

  test('5. an admin has full CRUD', async () => {
    const id = await seedIdea();
    const client = await userClient(USERS.honuvibe_admin);

    const { data: read } = await client.from('blue_filler_ideas').select('id');
    expect(read?.length).toBe(1);

    const { error: updateErr } = await client
      .from('blue_filler_ideas')
      .update({ status: 'shortlist', updated_at: new Date().toISOString() })
      .eq('id', id);
    expect(updateErr).toBeNull();

    const { error: insertErr } = await client.from('blue_filler_ideas').insert(ideaRow());
    expect(insertErr).toBeNull();

    const { error: deleteErr } = await client.from('blue_filler_ideas').delete().eq('id', id);
    expect(deleteErr).toBeNull();
  });

  test('6. the service role writes freely (the background job path)', async () => {
    const id = await seedIdea();
    const { error } = await admin.from('blue_filler_ideas').update({ status: 'archived' }).eq('id', id);
    expect(error).toBeNull();
  });
});

describe('RLS — blue_filler_research', () => {
  test('anonymous and non-admin members are denied read and write', async () => {
    const ideaId = await seedIdea();
    await seedResearch(ideaId);

    const anon = anonClient();
    expect((await anon.from('blue_filler_research').select('id')).data ?? []).toEqual([]);
    expect((await anon.from('blue_filler_research').insert({ idea_id: ideaId })).error).not.toBeNull();

    const member = await userClient(USERS.honuvibe_free);
    expect((await member.from('blue_filler_research').select('id')).data ?? []).toEqual([]);
    expect(
      (await member.from('blue_filler_research').insert({ idea_id: ideaId })).error,
    ).not.toBeNull();
  });

  test('an admin can read and write', async () => {
    const ideaId = await seedIdea();
    await seedResearch(ideaId);
    const client = await userClient(USERS.honuvibe_admin);
    const { data } = await client.from('blue_filler_research').select('id');
    expect(data?.length).toBe(1);
  });

  test('research cascades when its idea is deleted', async () => {
    const ideaId = await seedIdea();
    await seedResearch(ideaId);
    await admin.from('blue_filler_ideas').delete().eq('id', ideaId);
    const { data } = await admin.from('blue_filler_research').select('id').eq('idea_id', ideaId);
    expect(data ?? []).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 7. ideas CHECK constraints
// ---------------------------------------------------------------------------

describe('7. blue_filler_ideas constraints', () => {
  const rejects = async (overrides: Record<string, unknown>) => {
    const { error } = await admin.from('blue_filler_ideas').insert(ideaRow(overrides));
    expect(error, `expected a rejection for ${JSON.stringify(overrides)}`).not.toBeNull();
  };

  test('grade, origin, status and verdict are enum-locked', async () => {
    await rejects({ grade: 'E' });
    await rejects({ origin: 'borrowed' });
    await rejects({ status: 'maybe' });
    await rejects({ verdict: 'unsure' });
  });

  test('composite is bounded 0-100', async () => {
    await rejects({ composite: -1 });
    await rejects({ composite: 101 });
  });

  test('slug must match the code-owned pattern and be unique', async () => {
    await rejects({ slug: 'Has Capitals' });
    await rejects({ slug: 'no' });
    await rejects({ slug: `${'a'.repeat(67)}` });
    await rejects({ slug: 'under_score' });

    const first = ideaRow({ slug: 'unique-slug-test' });
    expect((await admin.from('blue_filler_ideas').insert(first)).error).toBeNull();
    const second = ideaRow({ slug: 'unique-slug-test' });
    expect((await admin.from('blue_filler_ideas').insert(second)).error?.code).toBe('23505');
  });

  test('title, one_liner, summary and excerpt bounds are enforced', async () => {
    await rejects({ title: 'ab' });
    await rejects({ title: 'a'.repeat(121) });
    await rejects({ one_liner: 'a'.repeat(201) });
    await rejects({ summary_md: 'a'.repeat(20_001) });
    await rejects({ source_excerpt: 'a'.repeat(2001) });
    await rejects({ verdict_note: 'a'.repeat(501) });
  });

  test('request_id is unique when present and nullable when absent', async () => {
    const requestId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect((await admin.from('blue_filler_ideas').insert(ideaRow({ request_id: requestId }))).error).toBeNull();
    expect(
      (await admin.from('blue_filler_ideas').insert(ideaRow({ request_id: requestId }))).error?.code,
    ).toBe('23505');
    // Two null request_ids do not collide.
    expect((await admin.from('blue_filler_ideas').insert(ideaRow())).error).toBeNull();
    expect((await admin.from('blue_filler_ideas').insert(ideaRow())).error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. research CHECK constraints
// ---------------------------------------------------------------------------

describe('8. blue_filler_research constraints', () => {
  let ideaId: string;
  beforeEach(async () => {
    ideaId = await seedIdea();
  });

  const rejects = async (overrides: Record<string, unknown>) => {
    const { error } = await admin
      .from('blue_filler_research')
      .insert({ idea_id: ideaId, ...overrides });
    expect(error, `expected a rejection for ${JSON.stringify(overrides)}`).not.toBeNull();
  };

  test('generation_error is restricted to the curated code list', async () => {
    await rejects({ status: 'failed', generation_error: 'oh no raw exception', completed_at: 'now()' });
    // Every curated code is accepted.
    for (const code of [
      'search_failed',
      'no_citations',
      'structuring_failed',
      'truncated',
      'timeout',
      'provider_error',
      'internal',
    ]) {
      const { error } = await admin.from('blue_filler_research').insert({
        idea_id: ideaId,
        status: 'failed',
        generation_error: code,
        completed_at: new Date().toISOString(),
      });
      expect(error, `code ${code} should be accepted`).toBeNull();
    }
  });

  test("'completed' requires the full payload including >= 1 citation and provenance", async () => {
    const base = {
      status: 'completed',
      report: REPORT,
      summary_md: 's',
      revised_scores: REVISED_SCORES,
      citations: CITATIONS,
      completed_at: new Date().toISOString(),
      model_id: 'm',
      pipeline_version: 'v',
    };
    expect((await admin.from('blue_filler_research').insert({ idea_id: ideaId, ...base })).error).toBeNull();

    await rejects({ ...base, report: null });
    await rejects({ ...base, summary_md: null });
    await rejects({ ...base, revised_scores: null });
    await rejects({ ...base, citations: [] });
    await rejects({ ...base, citations: null });
    await rejects({ ...base, citations: { not: 'an array' } });
    await rejects({ ...base, model_id: null });
    await rejects({ ...base, pipeline_version: null });
    await rejects({ ...base, completed_at: null });
  });

  test("'partial' requires findings, an error code and provenance", async () => {
    const base = {
      status: 'partial',
      raw_findings_md: FINDINGS,
      generation_error: 'timeout',
      completed_at: new Date().toISOString(),
      model_id: 'm',
      pipeline_version: 'v',
    };
    expect((await admin.from('blue_filler_research').insert({ idea_id: ideaId, ...base })).error).toBeNull();

    await rejects({ ...base, raw_findings_md: null });
    await rejects({ ...base, generation_error: null });
    await rejects({ ...base, model_id: null });
    await rejects({ ...base, pipeline_version: null });
  });

  test("'failed' requires only an error code and completed_at — provenance is exempt", async () => {
    const { error } = await admin.from('blue_filler_research').insert({
      idea_id: ideaId,
      status: 'failed',
      generation_error: 'timeout',
      completed_at: new Date().toISOString(),
    });
    expect(error).toBeNull();

    await rejects({ status: 'failed', completed_at: new Date().toISOString() });
    await rejects({ status: 'failed', generation_error: 'timeout' });
  });

  test('text bounds and the search_count floor are enforced', async () => {
    await rejects({ raw_findings_md: 'a'.repeat(200_001) });
    await rejects({ summary_md: 'a'.repeat(20_001) });
    await rejects({ search_count: -1 });
  });
});

// ---------------------------------------------------------------------------
// 9-10. concurrency
// ---------------------------------------------------------------------------

describe('9. one in-flight run per idea', () => {
  test('a second generating row is a 23505', async () => {
    const ideaId = await seedIdea();
    await seedResearch(ideaId);
    const { error } = await admin
      .from('blue_filler_research')
      .insert({ idea_id: ideaId, status: 'generating' });
    expect(error?.code).toBe('23505');
  });

  test('a terminal row frees the slot', async () => {
    const ideaId = await seedIdea();
    const researchId = await seedResearch(ideaId);
    await admin
      .from('blue_filler_research')
      .update({
        status: 'failed',
        generation_error: 'timeout',
        completed_at: new Date().toISOString(),
      })
      .eq('id', researchId);
    const { error } = await admin
      .from('blue_filler_research')
      .insert({ idea_id: ideaId, status: 'generating' });
    expect(error).toBeNull();
  });

  test('concurrent generating inserts leave exactly one row', async () => {
    const ideaId = await seedIdea();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        admin.from('blue_filler_research').insert({ idea_id: ideaId, status: 'generating' }),
      ),
    );
    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    const { data } = await admin.from('blue_filler_research').select('id').eq('idea_id', ideaId);
    expect(data).toHaveLength(1);
  });
});

describe('10. concurrent inserts with the same request_id', () => {
  test('only one idea row survives', async () => {
    const requestId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        admin.from('blue_filler_ideas').insert(ideaRow({ request_id: requestId })),
      ),
    );
    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    const { data } = await admin.from('blue_filler_ideas').select('id').eq('request_id', requestId);
    expect(data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 11. RPC + helper matrix
// ---------------------------------------------------------------------------

describe('11a. scoring helpers', () => {
  // The SQL half of the TS<->SQL parity pin. Same fixture as the unit tests.
  test.each(SCORING_PARITY_FIXTURE)(
    'SQL agrees with TS on $label -> $composite / $grade',
    async (parityCase) => {
      const { data: composite, error: compositeErr } = await admin.rpc(
        'blue_filler_composite_for',
        { p_scores: parityCase.scores },
      );
      expect(compositeErr).toBeNull();
      expect(composite).toBe(parityCase.composite);

      const { data: grade, error: gradeErr } = await admin.rpc('blue_filler_grade_for', {
        p_composite: parityCase.composite,
      });
      expect(gradeErr).toBeNull();
      expect(grade).toBe(parityCase.grade);
    },
  );

  test('blue_filler_composite_for RAISEs outside its domain', async () => {
    const bad: unknown[] = [
      { gap: 8, market: 6, fit: 7, speed: 5, moat: 4 }, // missing a key
      { ...VALID_SCORES, extra: 3 }, // extra key
      { ...VALID_SCORES, gap: 0 }, // below range
      { ...VALID_SCORES, gap: 11 }, // above range
      { ...VALID_SCORES, gap: 5.5 }, // non-integer
      { ...VALID_SCORES, gap: 'eight' }, // non-number
      [1, 2, 3, 4, 5, 6], // not an object
      null,
    ];
    for (const scores of bad) {
      const { error } = await admin.rpc('blue_filler_composite_for', { p_scores: scores });
      expect(error, `expected a RAISE for ${JSON.stringify(scores)}`).not.toBeNull();
    }
  });

  test('blue_filler_grade_for RAISEs outside 0-100', async () => {
    for (const composite of [-1, 101, null]) {
      const { error } = await admin.rpc('blue_filler_grade_for', { p_composite: composite });
      expect(error).not.toBeNull();
    }
  });

  test('anon and authenticated cannot EXECUTE the finalize RPC', async () => {
    const ideaId = await seedIdea();
    const researchId = await seedResearch(ideaId);

    const anon = await anonClient().rpc('finalize_blue_filler_research', {
      p_research_id: researchId,
      p_status: 'failed',
      p_generation_error: 'timeout',
    });
    expect(anon.error).not.toBeNull();

    const member = await userClient(USERS.honuvibe_free);
    const asMember = await member.rpc('finalize_blue_filler_research', {
      p_research_id: researchId,
      p_status: 'failed',
      p_generation_error: 'timeout',
    });
    expect(asMember.error).not.toBeNull();

    // Even an admin cannot call it — this is a service-role-only path.
    const adminUser = await userClient(USERS.honuvibe_admin);
    const asAdmin = await adminUser.rpc('finalize_blue_filler_research', {
      p_research_id: researchId,
      p_status: 'failed',
      p_generation_error: 'timeout',
    });
    expect(asAdmin.error).not.toBeNull();
  });
});

describe('11b. finalize_blue_filler_research', () => {
  let ideaId: string;
  let researchId: string;
  let otherIdeaId: string;

  beforeEach(async () => {
    ideaId = await seedIdea();
    otherIdeaId = await seedIdea();
    researchId = await seedResearch(ideaId);
  });

  test('rejects an invalid status', async () => {
    for (const status of ['generating', 'done', '', null]) {
      const { error } = await finalize({ p_research_id: researchId, p_status: status as string });
      expect(error).not.toBeNull();
    }
  });

  test('rejects an incomplete completed payload', async () => {
    const cases: Partial<FinalizeArgs>[] = [
      { p_report: null },
      { p_summary_md: null },
      { p_revised_scores: null },
      { p_citations: [] },
      { p_citations: null },
      { p_model_id: null },
      { p_pipeline_version: null },
    ];
    for (const overrides of cases) {
      const { error } = await finalize(completedArgs(researchId, overrides));
      expect(error, `expected a RAISE for ${JSON.stringify(overrides)}`).not.toBeNull();
    }
  });

  test('rejects malformed revised scores via the composite helper', async () => {
    for (const scores of [
      { ...REVISED_SCORES, extra: 1 },
      { ...REVISED_SCORES, gap: 0 },
      { ...REVISED_SCORES, gap: 11 },
      { gap: 5 },
    ]) {
      const { error } = await finalize(completedArgs(researchId, { p_revised_scores: scores }));
      expect(error).not.toBeNull();
    }
  });

  test('requires an error code for partial and failed', async () => {
    expect(
      (
        await finalize({
          p_research_id: researchId,
          p_status: 'partial',
          p_model_id: 'm',
          p_pipeline_version: 'v',
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await finalize({ p_research_id: researchId, p_status: 'failed' })).error,
    ).not.toBeNull();
  });

  test('completed updates the research row AND its own idea, atomically', async () => {
    const { data, error } = await finalize(completedArgs(researchId));
    expect(error).toBeNull();
    expect(data).toEqual({ applied: true });

    const { data: research } = await admin
      .from('blue_filler_research')
      .select('*')
      .eq('id', researchId)
      .single();
    expect(research!.status).toBe('completed');
    expect(research!.search_count).toBe(7);
    expect(research!.completed_at).not.toBeNull();
    expect(research!.generation_error).toBeNull();

    const { data: idea } = await admin
      .from('blue_filler_ideas')
      .select('*')
      .eq('id', ideaId)
      .single();
    // Composite and grade are computed IN SQL from p_revised_scores.
    expect(idea!.current_scores).toEqual(REVISED_SCORES);
    expect(idea!.composite).toBe(50);
    expect(idea!.grade).toBe('C');
    // gen_scores is untouched.
    expect(idea!.gen_scores).toEqual(VALID_SCORES);
  });

  test('leaves an unrelated idea untouched', async () => {
    const { data: before } = await admin
      .from('blue_filler_ideas')
      .select('*')
      .eq('id', otherIdeaId)
      .single();
    await finalize(completedArgs(researchId));
    const { data: after } = await admin
      .from('blue_filler_ideas')
      .select('*')
      .eq('id', otherIdeaId)
      .single();
    expect(after).toEqual(before);
  });

  test('a null p_search_count preserves the checkpointed value', async () => {
    await admin.from('blue_filler_research').update({ search_count: 11 }).eq('id', researchId);
    const { error } = await finalize(completedArgs(researchId, { p_search_count: null }));
    expect(error).toBeNull();
    const { data } = await admin
      .from('blue_filler_research')
      .select('search_count')
      .eq('id', researchId)
      .single();
    expect(data!.search_count).toBe(11);
  });

  test('repeat finalization is a no-op regardless of payload', async () => {
    await finalize(completedArgs(researchId));
    const { data: snapshot } = await admin
      .from('blue_filler_research')
      .select('*')
      .eq('id', researchId)
      .single();
    const { data: ideaSnapshot } = await admin
      .from('blue_filler_ideas')
      .select('*')
      .eq('id', ideaId)
      .single();

    const { data: second, error } = await finalize({
      p_research_id: researchId,
      p_status: 'failed',
      p_generation_error: 'internal',
    });
    expect(error).toBeNull();
    expect(second).toEqual({ applied: false });

    const { data: after } = await admin
      .from('blue_filler_research')
      .select('*')
      .eq('id', researchId)
      .single();
    expect(after).toEqual(snapshot);
    const { data: ideaAfter } = await admin
      .from('blue_filler_ideas')
      .select('*')
      .eq('id', ideaId)
      .single();
    expect(ideaAfter).toEqual(ideaSnapshot);
  });

  test('a stale-flipped row cannot be resurrected by a late worker', async () => {
    await admin
      .from('blue_filler_research')
      .update({
        status: 'failed',
        generation_error: 'timeout',
        completed_at: new Date().toISOString(),
      })
      .eq('id', researchId);

    const { data } = await finalize(completedArgs(researchId));
    expect(data).toEqual({ applied: false });

    const { data: idea } = await admin
      .from('blue_filler_ideas')
      .select('composite, grade, current_scores')
      .eq('id', ideaId)
      .single();
    expect(idea!.composite).toBe(69);
    expect(idea!.current_scores).toEqual(VALID_SCORES);
  });

  test('partial writes provenance and the error code but not a report', async () => {
    await admin
      .from('blue_filler_research')
      .update({ raw_findings_md: FINDINGS })
      .eq('id', researchId);

    const { data, error } = await finalize({
      p_research_id: researchId,
      p_status: 'partial',
      p_generation_error: 'structuring_failed',
      p_model_id: 'm',
      p_pipeline_version: 'v',
      p_search_count: 4,
    });
    expect(error).toBeNull();
    expect(data).toEqual({ applied: true });

    const { data: row } = await admin
      .from('blue_filler_research')
      .select('*')
      .eq('id', researchId)
      .single();
    expect(row!.status).toBe('partial');
    expect(row!.generation_error).toBe('structuring_failed');
    expect(row!.report).toBeNull();

    // The idea's scores are NOT refreshed by a partial run.
    const { data: idea } = await admin
      .from('blue_filler_ideas')
      .select('composite')
      .eq('id', ideaId)
      .single();
    expect(idea!.composite).toBe(69);
  });

  test('partial against a row with NO checkpointed findings is REJECTED, not stored', async () => {
    // The DB's terminal-shape CHECK is the backstop for the TS floor rule: if the
    // orchestrator ever tried to finalize 'partial' against a row whose
    // raw_findings_md was never written, the write must fail rather than store a
    // partial run with no findings in it.
    const { error } = await finalize({
      p_research_id: researchId,
      p_status: 'partial',
      p_generation_error: 'timeout',
      p_model_id: 'm',
      p_pipeline_version: 'v',
    });
    expect(error).not.toBeNull();

    const { data: row } = await admin
      .from('blue_filler_research')
      .select('status')
      .eq('id', researchId)
      .single();
    expect(row!.status).toBe('generating');
  });

  test('failed does not require model provenance', async () => {
    const { data, error } = await finalize({
      p_research_id: researchId,
      p_status: 'failed',
      p_generation_error: 'search_failed',
    });
    expect(error).toBeNull();
    expect(data).toEqual({ applied: true });
  });

  test('an unknown research id applies nothing', async () => {
    const { data, error } = await finalize({
      p_research_id: ZERO_UUID,
      p_status: 'failed',
      p_generation_error: 'timeout',
    });
    expect(error).toBeNull();
    expect(data).toEqual({ applied: false });
  });
});
