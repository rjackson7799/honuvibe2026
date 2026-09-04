/**
 * Studio engagement spine (migration 067) — RLS, uniqueness, the stage mirror
 * and its guard, timestamp anchors, the five RPCs, the append-only timeline,
 * the answer lock, and the autosave-vs-submit concurrency + crash-point cases.
 *
 * Same harness as prospects_rls.test.ts. Two additions:
 *   - the TS<->SQL mirror parity is asserted from the SAME fixture the unit
 *     test uses (lib/studio/engagement/stages.ts), like blue_filler_rls;
 *   - the concurrency cases need TWO open transactions, which PostgREST cannot
 *     hold, so they use a raw `pg` connection to the local stack (TEST_SUPABASE_DB_URL,
 *     defaulting to the CLI's local URL).
 *
 * Teardown deletes engagements BEFORE leads: engagements.lead_id is
 * ON DELETE RESTRICT on purpose.
 */
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import {
  ACTIVE_ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGES,
  STAGE_MIRROR_PARITY_FIXTURE,
  salesStageFor,
  type EngagementStage,
} from '../../lib/studio/engagement/stages';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const DB_URL =
  process.env.TEST_SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const svc = serviceClient();

// Integration tests: several cases make 10-20 sequential round-trips through
// PostgREST, which blows the 5s default when the whole suite runs on a loaded
// machine (it passes alone in well under that). 20s is headroom, not slack.
vi.setConfig({ testTimeout: 20_000 });

const FIXTURE_BIZ = 'RLS Fixture Engagement Biz';
const LEAD = {
  qualified: '55555555-5555-5555-5555-555555550001',
  fresh: '55555555-5555-5555-5555-555555550002', // sales_stage 'new'
  won: '55555555-5555-5555-5555-555555550003',
  lost: '55555555-5555-5555-5555-555555550004',
  q2: '55555555-5555-5555-5555-555555550005',
  q3: '55555555-5555-5555-5555-555555550006',
  q4: '55555555-5555-5555-5555-555555550007',
} as const;
const LEAD_IDS = Object.values(LEAD);

const RPCS = [
  'start_engagement',
  'submit_engagement_questionnaire',
  'touch_engagement_questionnaire_open',
  'finalize_engagement_questionnaire_tailoring',
  'finalize_engagement_brief',
] as const;

const TABLES = [
  'engagements',
  'engagement_events',
  'engagement_questionnaires',
  'engagement_questionnaire_answers',
  'engagement_briefs',
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withPg<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function seedLeads(): Promise<void> {
  const rows = [
    {
      id: LEAD.qualified,
      name: 'Kai Fixture',
      email: 'kai@fixture.local',
      business_name: FIXTURE_BIZ,
      source_locale: 'ja',
      tier_interest: 'pro',
      sales_stage: 'qualified',
    },
    { id: LEAD.fresh, name: 'New Fixture', email: 'new@fixture.local', business_name: FIXTURE_BIZ, sales_stage: 'new' },
    { id: LEAD.won, name: 'Won Fixture', email: 'won@fixture.local', business_name: FIXTURE_BIZ, sales_stage: 'won' },
    { id: LEAD.lost, name: 'Lost Fixture', email: 'lost@fixture.local', business_name: FIXTURE_BIZ, sales_stage: 'lost' },
    {
      id: LEAD.q2,
      name: null,
      email: null,
      business_name: FIXTURE_BIZ,
      source_locale: 'en',
      tier_interest: 'not_sure',
      sales_stage: 'qualified',
    },
    { id: LEAD.q3, name: 'Q3', email: 'q3@fixture.local', business_name: FIXTURE_BIZ, sales_stage: 'qualified' },
    { id: LEAD.q4, name: 'Q4', email: 'q4@fixture.local', business_name: FIXTURE_BIZ, sales_stage: 'qualified' },
  ].map((r) => ({ source: 'manual', lifecycle: 'new', source_locale: 'en', tier_interest: null, ...r }));
  const { error } = await svc.from('leads').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

async function resetEngagements(): Promise<void> {
  // Engagements first (RESTRICT); children cascade; the AFTER DELETE mirror
  // resets each lead to 'qualified', which seedLeads then overwrites.
  const { error } = await svc.from('engagements').delete().in('lead_id', LEAD_IDS);
  if (error) throw error;
}

async function start(leadId: string): Promise<string> {
  const { data, error } = await svc.rpc('start_engagement', { p_lead_id: leadId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { engagement_id: string };
  return row.engagement_id;
}

async function setStage(id: string, stage: EngagementStage, extra: Record<string, unknown> = {}) {
  return svc.from('engagements').update({ stage, ...extra }).eq('id', id);
}

async function engagement(id: string) {
  const { data, error } = await svc.from('engagements').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Record<string, unknown> & { stage: EngagementStage };
}

async function leadStage(leadId: string): Promise<string> {
  const { data, error } = await svc.from('leads').select('sales_stage').eq('id', leadId).single();
  if (error) throw error;
  return data!.sales_stage as string;
}

async function events(engagementId: string) {
  const { data, error } = await svc
    .from('engagement_events')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Record<string, unknown>[];
}

const MANIFEST = {
  sections: [{ key: 'orientation', title: 'Orientation', blurb: null }],
  questions: [
    {
      id: 'about',
      section_key: 'orientation',
      qtype: 'text',
      prompt: 'Tell us about the business.',
      help: null,
      required: true,
      options: [],
      allow_other: false,
      max_select: null,
      long: true,
    },
    {
      id: 'goal',
      section_key: 'orientation',
      qtype: 'single',
      prompt: 'Main goal?',
      help: null,
      required: false,
      options: [
        { value: 'leads', label: 'More leads' },
        { value: 'bookings', label: 'More bookings' },
      ],
      allow_other: true,
      max_select: null,
      long: false,
    },
  ],
};

async function seedQuestionnaire(engagementId: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await svc
    .from('engagement_questionnaires')
    .insert({
      engagement_id: engagementId,
      kind: 'discovery',
      locale: 'en',
      title: 'Discovery questionnaire',
      sections: MANIFEST.sections,
      questions: MANIFEST.questions,
      ...overrides,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

function tokenPair(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: createHash('sha256').update(token).digest('hex') };
}

/** What sendQuestionnaire() (slice 2) writes: hash only, sent_at, expiry. */
async function sendQuestionnaire(qid: string): Promise<{ token: string; hash: string }> {
  const pair = tokenPair();
  const now = new Date();
  const { error } = await svc
    .from('engagement_questionnaires')
    .update({
      status: 'sent',
      sent_at: now.toISOString(),
      access_token_hash: pair.hash,
      token_issued_at: now.toISOString(),
      token_expires_at: new Date(now.getTime() + 45 * 86400_000).toISOString(),
    })
    .eq('id', qid);
  if (error) throw error;
  return pair;
}

async function upsertAnswer(
  qid: string,
  questionId: string,
  answer: unknown,
  otherText: string | null = null,
  version = 1,
) {
  return svc
    .from('engagement_questionnaire_answers')
    .upsert(
      { questionnaire_id: qid, question_id: questionId, answer, other_text: otherText, questions_version: version },
      { onConflict: 'questionnaire_id,question_id' },
    );
}

async function questionnaire(qid: string) {
  const { data, error } = await svc.from('engagement_questionnaires').select('*').eq('id', qid).single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

async function briefs(engagementId: string) {
  const { data, error } = await svc
    .from('engagement_briefs')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Record<string, unknown>[];
}

/** A questionnaire that is sent with its required answer present — submit-ready. */
async function submitReady(leadId: string = LEAD.qualified) {
  const eid = await start(leadId);
  const qid = await seedQuestionnaire(eid);
  const pair = await sendQuestionnaire(qid);
  const { error } = await upsertAnswer(qid, 'about', 'A family-run café in Kailua.');
  if (error) throw error;
  return { eid, qid, ...pair };
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await resetEngagements();
  await seedLeads();
});

afterAll(async () => {
  await resetEngagements();
  await svc.from('leads').delete().in('id', LEAD_IDS);
});

// ────────────────────────────────────────────────────────────────────────────
// RLS
// ────────────────────────────────────────────────────────────────────────────
describe('RLS — admin-only on all five tables and the view', () => {
  test('anon and a non-admin member cannot read any table (nor the view)', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    await upsertAnswer(qid, 'about', 'x');
    await svc.from('engagement_briefs').insert({ engagement_id: eid, status: 'generating' });

    const member = await userClient(USERS.honuvibe_free);
    for (const table of [...TABLES, 'engagement_list']) {
      const { data: anonData } = await anonClient().from(table).select('id');
      expect(anonData ?? [], `anon ${table}`).toEqual([]);
      const { data: memberData } = await member.from(table).select('id');
      expect(memberData ?? [], `member ${table}`).toEqual([]);
    }
  });

  test('anon and a non-admin member cannot insert into any table', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    const member = await userClient(USERS.honuvibe_free);
    const rows: Record<(typeof TABLES)[number], Record<string, unknown>> = {
      engagements: { lead_id: LEAD.q2, title: 'x', locale: 'en' },
      engagement_events: { engagement_id: eid, kind: 'note', summary: 'x' },
      engagement_questionnaires: { engagement_id: eid, kind: 'discovery', locale: 'en', title: 'x' },
      engagement_questionnaire_answers: { questionnaire_id: qid, question_id: 'about', answer: 'x', questions_version: 1 },
      engagement_briefs: { engagement_id: eid },
    };
    for (const table of TABLES) {
      const { error: anonErr } = await anonClient().from(table).insert(rows[table]);
      expect(anonErr, `anon ${table}`).not.toBeNull();
      const { error: memberErr } = await member.from(table).insert(rows[table]);
      expect(memberErr, `member ${table}`).not.toBeNull();
    }
    // Nothing leaked through: the second lead is still unengaged.
    expect(await leadStage(LEAD.q2)).toBe('qualified');
  });

  test('anon and a non-admin member cannot UPDATE or DELETE (silent no-ops; rows unchanged)', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    const member = await userClient(USERS.honuvibe_free);
    for (const [label, client] of [['anon', anonClient()], ['member', member]] as const) {
      const { data: upd, error: updErr } = await client
        .from('engagements')
        .update({ title: `${label} was here` })
        .eq('id', eid)
        .select('id');
      expect(updErr, `${label} update`).toBeNull();
      expect(upd ?? [], `${label} update rows`).toEqual([]);
      const { data: del } = await client.from('engagement_questionnaires').delete().eq('id', qid).select('id');
      expect(del ?? [], `${label} delete rows`).toEqual([]);
    }
    expect((await engagement(eid)).title).toBe(FIXTURE_BIZ);
    expect((await questionnaire(qid)).id).toBe(qid);
  });

  test('an admin has full CRUD on all five tables', async () => {
    const admin = await userClient(USERS.honuvibe_admin);

    // Start from 'new' so the mirror's write is observable (not vacuous): the
    // insert below bypasses start_engagement on purpose — this is the
    // admin-session path through the trigger.
    await svc.from('leads').update({ sales_stage: 'new' }).eq('id', LEAD.qualified);
    const { data: e, error: eErr } = await admin
      .from('engagements')
      .insert({ lead_id: LEAD.qualified, title: 'Admin-made', locale: 'en' })
      .select('id')
      .single();
    expect(eErr).toBeNull();
    const eid = e!.id as string;
    // The trigger mirrored the insert even though an authenticated user wrote it.
    expect(await leadStage(LEAD.qualified)).toBe('qualified');

    const { data: ev, error: evErr } = await admin
      .from('engagement_events')
      .insert({ engagement_id: eid, kind: 'note', summary: 'Called them', needs_attention: true })
      .select('id')
      .single();
    expect(evErr).toBeNull();

    const { data: q, error: qErr } = await admin
      .from('engagement_questionnaires')
      .insert({ engagement_id: eid, kind: 'discovery', locale: 'en', title: 'Q', sections: MANIFEST.sections, questions: MANIFEST.questions })
      .select('id')
      .single();
    expect(qErr).toBeNull();

    const { data: a, error: aErr } = await admin
      .from('engagement_questionnaire_answers')
      .insert({ questionnaire_id: q!.id, question_id: 'about', answer: 'x', questions_version: 1 })
      .select('id')
      .single();
    expect(aErr).toBeNull();

    const { data: b, error: bErr } = await admin
      .from('engagement_briefs')
      .insert({ engagement_id: eid, questionnaire_id: q!.id })
      .select('id')
      .single();
    expect(bErr).toBeNull();

    // SELECT + UPDATE
    const { data: list } = await admin.from('engagement_list').select('id, discovery_question_count, discovery_answered_count').eq('id', eid);
    expect(list).toEqual([{ id: eid, discovery_question_count: 2, discovery_answered_count: 1 }]);
    expect((await admin.from('engagements').update({ notes: 'n' }).eq('id', eid)).error).toBeNull();
    expect((await admin.from('engagement_events').update({ resolved_at: new Date().toISOString() }).eq('id', ev!.id)).error).toBeNull();
    expect((await admin.from('engagement_questionnaires').update({ title: 'Q2' }).eq('id', q!.id)).error).toBeNull();
    expect((await admin.from('engagement_questionnaire_answers').update({ answer: 'y' }).eq('id', a!.id)).error).toBeNull();
    expect((await admin.from('engagement_briefs').update({ status: 'failed', generation_error: 'internal', completed_at: new Date().toISOString() }).eq('id', b!.id)).error).toBeNull();

    // DELETE (leaf first, then the engagement — which cascades what is left)
    expect((await admin.from('engagement_questionnaire_answers').delete().eq('id', a!.id)).error).toBeNull();
    expect((await admin.from('engagement_briefs').delete().eq('id', b!.id)).error).toBeNull();
    expect((await admin.from('engagement_questionnaires').delete().eq('id', q!.id)).error).toBeNull();
    expect((await admin.from('engagement_events').delete().eq('id', ev!.id)).error).toBeNull();
    expect((await admin.from('engagements').delete().eq('id', eid)).error).toBeNull();
    const { data: after } = await svc.from('engagements').select('id').eq('id', eid);
    expect(after ?? []).toEqual([]);
  });

  test('the service role writes freely (the route / server-action path)', async () => {
    const eid = await start(LEAD.qualified);
    const { error } = await svc.from('engagements').update({ next_action: 'Send the questionnaire', contract_value: 480000 }).eq('id', eid);
    expect(error).toBeNull();
  });
});

describe('RPC EXECUTE — service role only', () => {
  test('anon, a member AND an admin are all denied on every RPC; no side effects', async () => {
    const eid = await start(LEAD.q3);
    const qid = await seedQuestionnaire(eid);
    const member = await userClient(USERS.honuvibe_free);
    const admin = await userClient(USERS.honuvibe_admin);
    const args: Record<(typeof RPCS)[number], Record<string, unknown>> = {
      start_engagement: { p_lead_id: LEAD.qualified },
      submit_engagement_questionnaire: { p_questionnaire_id: qid },
      touch_engagement_questionnaire_open: { p_questionnaire_id: qid },
      finalize_engagement_questionnaire_tailoring: { p_questionnaire_id: qid, p_status: 'failed', p_tailoring_error: 'internal' },
      finalize_engagement_brief: { p_brief_id: ZERO_UUID, p_status: 'failed', p_generation_error: 'internal' },
    };
    for (const rpc of RPCS) {
      for (const [label, client] of [['anon', anonClient()], ['member', member], ['admin', admin]] as const) {
        const { error } = await client.rpc(rpc, args[rpc]);
        expect(error, `${label} ${rpc}`).not.toBeNull();
      }
    }
    // start_engagement never ran: the qualified lead is still unengaged.
    const { data } = await svc.from('engagements').select('id').eq('lead_id', LEAD.qualified);
    expect(data ?? []).toEqual([]);
  });

  test('the catalog agrees: EXECUTE is granted to service_role and to nobody public', async () => {
    await withPg(async (c) => {
      const sigs: Record<(typeof RPCS)[number], string> = {
        start_engagement: 'public.start_engagement(uuid)',
        submit_engagement_questionnaire: 'public.submit_engagement_questionnaire(uuid)',
        touch_engagement_questionnaire_open: 'public.touch_engagement_questionnaire_open(uuid)',
        finalize_engagement_questionnaire_tailoring:
          'public.finalize_engagement_questionnaire_tailoring(uuid,text,jsonb,jsonb,text,text,text)',
        finalize_engagement_brief:
          'public.finalize_engagement_brief(uuid,text,text,text,jsonb,jsonb,text,text,text,text)',
      };
      for (const rpc of RPCS) {
        for (const role of ['anon', 'authenticated']) {
          const r = await c.query('select has_function_privilege($1, $2, $3) as ok', [role, sigs[rpc], 'EXECUTE']);
          expect(r.rows[0].ok, `${role} ${rpc}`).toBe(false);
        }
        const s = await c.query('select has_function_privilege($1, $2, $3) as ok', ['service_role', sigs[rpc], 'EXECUTE']);
        expect(s.rows[0].ok, `service_role ${rpc}`).toBe(true);
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Uniqueness / single-flight
// ────────────────────────────────────────────────────────────────────────────
describe('uniqueness', () => {
  test('UNIQUE (lead_id) is a hard unique: a second engagement for a lead is 23505, in any stage', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'lost', { lost_reason: 'Went with a cousin' }); // terminal — still unique
    const { error } = await svc.from('engagements').insert({ lead_id: LEAD.qualified, title: 'Second', locale: 'en' });
    expect(error?.code).toBe('23505');
    await withPg(async (c) => {
      const r = await c.query("select indexdef from pg_indexes where indexname = 'uq_engagements_lead'");
      expect(r.rows[0].indexdef).toMatch(/UNIQUE/);
      expect(r.rows[0].indexdef).not.toMatch(/WHERE/); // hard, not partial
    });
  });

  test('UNIQUE (engagement_id, kind) rejects a second discovery questionnaire in any status', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    await sendQuestionnaire(qid);
    const { error } = await svc
      .from('engagement_questionnaires')
      .insert({ engagement_id: eid, kind: 'discovery', locale: 'en', title: 'Again' });
    expect(error?.code).toBe('23505');
  });

  test('one generating brief per engagement; the slot frees on a terminal status', async () => {
    const eid = await start(LEAD.qualified);
    const { data: first } = await svc.from('engagement_briefs').insert({ engagement_id: eid }).select('id').single();
    const { error: second } = await svc.from('engagement_briefs').insert({ engagement_id: eid });
    expect(second?.code).toBe('23505');

    const { error: fin } = await svc.rpc('finalize_engagement_brief', {
      p_brief_id: first!.id,
      p_status: 'failed',
      p_generation_error: 'provider_error',
    });
    expect(fin).toBeNull();
    const { error: third } = await svc.from('engagement_briefs').insert({ engagement_id: eid });
    expect(third).toBeNull();
  });

  test('the single-flight indexes exist (tailoring anchor enforced; its partial index is redundant with UNIQUE(engagement_id, kind) while kind has one value)', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    const { error } = await svc
      .from('engagement_questionnaires')
      .update({ tailoring_status: 'generating', tailoring_started_at: new Date().toISOString() })
      .eq('id', qid);
    expect(error).toBeNull();
    // 'generating' without its anchor is rejected outright.
    const { error: noAnchor } = await svc
      .from('engagement_questionnaires')
      .update({ tailoring_status: 'generating', tailoring_started_at: null })
      .eq('id', qid);
    expect(noAnchor).not.toBeNull();
    await withPg(async (c) => {
      const r = await c.query(
        "select indexname, indexdef from pg_indexes where indexname in ('uq_engagement_questionnaires_one_tailoring','uq_engagement_briefs_one_generating','uq_engagement_questionnaires_token_hash','uq_engagement_questionnaires_engagement_kind') order by 1",
      );
      expect(r.rows.map((x) => x.indexname)).toEqual([
        'uq_engagement_briefs_one_generating',
        'uq_engagement_questionnaires_engagement_kind',
        'uq_engagement_questionnaires_one_tailoring',
        'uq_engagement_questionnaires_token_hash',
      ]);
      expect(r.rows.find((x) => x.indexname === 'uq_engagement_questionnaires_one_tailoring').indexdef).toMatch(
        /WHERE \(tailoring_status = 'generating'/,
      );
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// The mirror
// ────────────────────────────────────────────────────────────────────────────
describe('the stage mirror', () => {
  test.each(STAGE_MIRROR_PARITY_FIXTURE)(
    'SQL agrees with TS: $stage -> $sales_stage',
    async ({ stage, sales_stage }) => {
      const admin = await userClient(USERS.honuvibe_admin);
      const { data, error } = await admin.rpc('engagement_sales_stage_for', { p_stage: stage });
      expect(error).toBeNull();
      expect(data).toBe(sales_stage);
      expect(salesStageFor(stage)).toBe(sales_stage);
    },
  );

  test('engagement_sales_stage_for RAISEs on an unknown stage and never returns NULL', async () => {
    const { error } = await svc.rpc('engagement_sales_stage_for', { p_stage: 'bogus' });
    expect(error?.message).toContain('unknown engagement stage');
    const { error: nullErr } = await svc.rpc('engagement_sales_stage_for', { p_stage: null });
    expect(nullErr).not.toBeNull();
  });

  test('insert mirrors to qualified; each transition writes the mapped value', async () => {
    const eid = await start(LEAD.qualified);
    expect(await leadStage(LEAD.qualified)).toBe('qualified');
    for (const stage of ['proposal', 'build', 'launch', 'care', 'closed', 'discovery'] as const) {
      const { error } = await setStage(eid, stage);
      expect(error, stage).toBeNull();
      expect(await leadStage(LEAD.qualified), stage).toBe(salesStageFor(stage));
    }
    const { error } = await setStage(eid, 'lost', { lost_reason: 'Budget' });
    expect(error).toBeNull();
    expect(await leadStage(LEAD.qualified)).toBe('lost');
  });

  test('lead_id is immutable — repointing an engagement would orphan the mirror', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'build');
    const { error } = await svc.from('engagements').update({ lead_id: LEAD.q2 }).eq('id', eid);
    expect(error?.message).toContain('engagement_lead_id_immutable');
    expect((await engagement(eid)).lead_id).toBe(LEAD.qualified);
    expect(await leadStage(LEAD.qualified)).toBe('won');
    expect(await leadStage(LEAD.q2)).toBe('qualified');
  });

  test('deleting the engagement resets the lead to qualified', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'build');
    expect(await leadStage(LEAD.qualified)).toBe('won');
    const { error } = await svc.from('engagements').delete().eq('id', eid);
    expect(error).toBeNull();
    expect(await leadStage(LEAD.qualified)).toBe('qualified');
  });

  test('a conflicting direct write to leads.sales_stage RAISEs for admin AND service role; the mirrored value is allowed', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'build');

    const admin = await userClient(USERS.honuvibe_admin);
    const { error: adminErr } = await admin.from('leads').update({ sales_stage: 'new' }).eq('id', LEAD.qualified);
    expect(adminErr?.message).toContain('lead_sales_stage_is_engagement_derived');

    const { error: svcErr } = await svc.from('leads').update({ sales_stage: 'new' }).eq('id', LEAD.qualified);
    expect(svcErr?.message).toContain('lead_sales_stage_is_engagement_derived');

    // Writing exactly what the mirror would write is not a conflict (a stale
    // but correct client does not 500), and other columns are untouched.
    const { error: sameErr } = await svc.from('leads').update({ sales_stage: 'won', notes: 'ok' }).eq('id', LEAD.qualified);
    expect(sameErr).toBeNull();
    expect(await leadStage(LEAD.qualified)).toBe('won');

    // An unengaged lead is still freely writable.
    const { error: freeErr } = await svc.from('leads').update({ sales_stage: 'proposal' }).eq('id', LEAD.q2);
    expect(freeErr).toBeNull();
  });

  test('zero drift after a randomised transition sequence across three engagements', async () => {
    const ids = [await start(LEAD.qualified), await start(LEAD.q3), await start(LEAD.q4)];
    const leads = [LEAD.qualified, LEAD.q3, LEAD.q4];
    // Deterministic LCG so a failure is reproducible.
    let seed = 20260904;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    for (let i = 0; i < 30; i += 1) {
      const k = rnd(ids.length);
      const stage = ENGAGEMENT_STAGES[rnd(ENGAGEMENT_STAGES.length)];
      const { error } = await setStage(ids[k], stage, stage === 'lost' ? { lost_reason: `step ${i}` } : {});
      expect(error, `step ${i}: ${stage}`).toBeNull();
    }
    for (let k = 0; k < ids.length; k += 1) {
      const e = await engagement(ids[k]);
      expect(await leadStage(leads[k])).toBe(salesStageFor(e.stage));
    }
    await withPg(async (c) => {
      const r = await c.query(
        'select count(*)::int as n from public.engagements e join public.leads l on l.id = e.lead_id where l.sales_stage <> public.engagement_sales_stage_for(e.stage)',
      );
      expect(r.rows[0].n).toBe(0);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Anchors
// ────────────────────────────────────────────────────────────────────────────
describe('timestamp anchors', () => {
  test('won_at is set on first build and unchanged by build -> discovery -> build; stage_entered_at always moves', async () => {
    const eid = await start(LEAD.qualified);
    const before = await engagement(eid);
    expect(before.won_at).toBeNull();

    await sleep(20);
    await setStage(eid, 'build');
    const won = await engagement(eid);
    expect(won.won_at).not.toBeNull();
    expect(won.stage_entered_at).not.toBe(before.stage_entered_at);

    await sleep(20);
    await setStage(eid, 'discovery');
    const back = await engagement(eid);
    expect(back.won_at).toBe(won.won_at);
    expect(back.stage_entered_at).not.toBe(won.stage_entered_at);

    await sleep(20);
    await setStage(eid, 'build');
    expect((await engagement(eid)).won_at).toBe(won.won_at);
  });

  test('care_ended_at is set on leaving care and cleared on re-entry; care_started_at is set once', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'care');
    const inCare = await engagement(eid);
    expect(inCare.care_started_at).not.toBeNull();
    expect(inCare.care_ended_at).toBeNull();

    await setStage(eid, 'launch');
    const left = await engagement(eid);
    expect(left.care_ended_at).not.toBeNull();
    expect(left.care_started_at).toBe(inCare.care_started_at);

    await setStage(eid, 'care');
    const again = await engagement(eid);
    expect(again.care_ended_at).toBeNull();
    expect(again.care_started_at).toBe(inCare.care_started_at);
  });

  test('leaving care with a manually-nulled care_started_at still satisfies the care-window CHECK', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'care');
    const inCare = await engagement(eid);
    const { error: nullErr } = await svc.from('engagements').update({ care_started_at: null }).eq('id', eid);
    expect(nullErr).toBeNull(); // allowed while care_ended_at is null
    const { error } = await setStage(eid, 'launch');
    expect(error).toBeNull();
    const left = await engagement(eid);
    expect(left.care_ended_at).not.toBeNull();
    expect(left.care_started_at).toBe(inCare.stage_entered_at);
  });

  test('lost requires lost_reason and sets ended_at; lost -> discovery clears both', async () => {
    const eid = await start(LEAD.qualified);
    const { error: noReason } = await setStage(eid, 'lost');
    expect(noReason?.message).toContain('lost_reason_required');
    const { error: blank } = await setStage(eid, 'lost', { lost_reason: '   ' });
    expect(blank).not.toBeNull();
    expect((await engagement(eid)).stage).toBe('discovery');

    const { error } = await setStage(eid, 'lost', { lost_reason: 'Chose a DIY builder' });
    expect(error).toBeNull();
    const lost = await engagement(eid);
    expect(lost.ended_at).not.toBeNull();
    expect(lost.lost_reason).toBe('Chose a DIY builder');

    await setStage(eid, 'discovery');
    const reopened = await engagement(eid);
    expect(reopened.ended_at).toBeNull();
    expect(reopened.lost_reason).toBeNull();
    expect(await leadStage(LEAD.qualified)).toBe('qualified');
  });

  test('closed sets ended_at with lost_reason null (even if one was supplied) and keeps won_at', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'care');
    const { error } = await setStage(eid, 'closed', { lost_reason: 'should be dropped' });
    expect(error).toBeNull();
    const closed = await engagement(eid);
    expect(closed.ended_at).not.toBeNull();
    expect(closed.lost_reason).toBeNull();
    expect(closed.won_at).not.toBeNull();
    expect(closed.care_ended_at).not.toBeNull();
    expect(await leadStage(LEAD.qualified)).toBe('won');
  });

  test('a lost_reason on an active stage violates the terminal-shape CHECK', async () => {
    const eid = await start(LEAD.qualified);
    const { error } = await svc.from('engagements').update({ lost_reason: 'x' }).eq('id', eid);
    expect(error).not.toBeNull();
  });

  test('entering a terminal stage revokes a live token and resolves open attention; a submitted token is left alone', async () => {
    const live = await submitReady(LEAD.qualified);
    const done = await submitReady(LEAD.q3);
    const { error: subErr } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: done.qid });
    expect(subErr).toBeNull();

    const { data: attention } = await svc
      .from('engagement_events')
      .insert({ engagement_id: live.eid, kind: 'note', summary: 'Chase them', needs_attention: true })
      .select('id')
      .single();

    const { error } = await setStage(live.eid, 'lost', { lost_reason: 'Ghosted' });
    expect(error).toBeNull();
    expect((await questionnaire(live.qid)).token_revoked_at).not.toBeNull();
    const { data: resolved } = await svc.from('engagement_events').select('resolved_at').eq('id', attention!.id).single();
    expect(resolved!.resolved_at).not.toBeNull();

    await setStage(done.eid, 'closed');
    expect((await questionnaire(done.qid)).token_revoked_at).toBeNull();

    // Reopening does not un-revoke.
    await setStage(live.eid, 'discovery');
    expect((await questionnaire(live.qid)).token_revoked_at).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// start_engagement
// ────────────────────────────────────────────────────────────────────────────
describe('start_engagement', () => {
  test('RAISEs lead_not_found', async () => {
    const { error } = await svc.rpc('start_engagement', { p_lead_id: ZERO_UUID });
    expect(error?.message).toContain('lead_not_found');
  });

  test.each(['fresh', 'won', 'lost'] as const)('RAISEs lead_not_qualified from %s', async (key) => {
    const { error } = await svc.rpc('start_engagement', { p_lead_id: LEAD[key] });
    expect(error?.message).toContain('lead_not_qualified');
    const { data } = await svc.from('engagements').select('id').eq('lead_id', LEAD[key]);
    expect(data ?? []).toEqual([]);
  });

  test('succeeds from qualified with title/locale/contact/tier seeded from the lead', async () => {
    const { data, error } = await svc.rpc('start_engagement', { p_lead_id: LEAD.qualified });
    expect(error).toBeNull();
    const row = (Array.isArray(data) ? data[0] : data) as { engagement_id: string; already_started: boolean };
    expect(row.already_started).toBe(false);
    const e = await engagement(row.engagement_id);
    expect(e).toMatchObject({
      lead_id: LEAD.qualified,
      title: FIXTURE_BIZ,
      locale: 'ja',
      client_contact_name: 'Kai Fixture',
      client_contact_email: 'kai@fixture.local',
      tier: 'pro',
      stage: 'discovery',
    });
    expect(e.stage_entered_at).not.toBeNull();

    // not_sure -> null tier; null name/email survive.
    const eid2 = await start(LEAD.q2);
    expect(await engagement(eid2)).toMatchObject({ tier: null, client_contact_name: null, client_contact_email: null, locale: 'en' });
  });

  test('replay returns already_started = true with one row and ONE stage_changed event', async () => {
    const first = await start(LEAD.qualified);
    const { data, error } = await svc.rpc('start_engagement', { p_lead_id: LEAD.qualified });
    expect(error).toBeNull();
    const row = (Array.isArray(data) ? data[0] : data) as { engagement_id: string; already_started: boolean };
    expect(row).toEqual({ engagement_id: first, already_started: true });
    const { data: rows } = await svc.from('engagements').select('id').eq('lead_id', LEAD.qualified);
    expect(rows!.length).toBe(1);
    const evs = await events(first);
    expect(evs.filter((e) => e.kind === 'stage_changed')).toHaveLength(1);
    expect(evs[0]).toMatchObject({ kind: 'stage_changed', from_stage: null, to_stage: 'discovery' });
  });

  test('two concurrent calls produce exactly one row', async () => {
    const [a, b] = await Promise.all([
      svc.rpc('start_engagement', { p_lead_id: LEAD.qualified }),
      svc.rpc('start_engagement', { p_lead_id: LEAD.qualified }),
    ]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    const ra = (a.data as { engagement_id: string; already_started: boolean }[])[0];
    const rb = (b.data as { engagement_id: string; already_started: boolean }[])[0];
    expect(ra.engagement_id).toBe(rb.engagement_id);
    expect([ra.already_started, rb.already_started].filter(Boolean)).toHaveLength(1);
    const { data: rows } = await svc.from('engagements').select('id').eq('lead_id', LEAD.qualified);
    expect(rows!.length).toBe(1);
    expect((await events(ra.engagement_id)).filter((e) => e.kind === 'stage_changed')).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Autosave vs submit
// ────────────────────────────────────────────────────────────────────────────
describe('autosave vs submit concurrency', () => {
  test(
    'an answer upsert started BEFORE submit and committed after it began is IN the snapshot',
    async () => {
      const { qid } = await submitReady();
      await withPg(async (a) => {
        await a.query('BEGIN');
        // Holds FOR KEY SHARE on the questionnaire row until COMMIT.
        await a.query(
          `insert into public.engagement_questionnaire_answers (questionnaire_id, question_id, answer, other_text, questions_version)
           values ($1, 'goal', '"leads"'::jsonb, null, 1)`,
          [qid],
        );
        const submit = (async () => svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid }))();
        await sleep(500);
        // The RPC is blocked on its FOR UPDATE: nothing has flipped yet.
        expect((await questionnaire(qid)).status).toBe('sent');
        await a.query('COMMIT');
        const { data, error } = await submit;
        expect(error).toBeNull();
        expect((data as { applied: boolean }).applied).toBe(true);
      });
      const q = await questionnaire(qid);
      expect(q.status).toBe('submitted');
      const snapshot = q.answer_snapshot as { answers: { question_id: string; answer: unknown }[] };
      expect(snapshot.answers.map((x) => x.question_id).sort()).toEqual(['about', 'goal']);
      expect(snapshot.answers.find((x) => x.question_id === 'goal')!.answer).toBe('leads');
    },
    15000,
  );

  test(
    'an upsert started AFTER the RPC took its lock waits, then RAISEs questionnaire_not_open',
    async () => {
      const { qid } = await submitReady();
      await withPg(async (a) => {
        await a.query('BEGIN');
        const r = await a.query('select public.submit_engagement_questionnaire($1) as r', [qid]);
        expect(r.rows[0].r.applied).toBe(true);
        // Blocks on FOR KEY SHARE (the RPC's FOR UPDATE is held by A) …
        const upsert = (async () => upsertAnswer(qid, 'goal', 'leads'))();
        await sleep(500);
        await a.query('COMMIT');
        // … then sees 'submitted'.
        const { error } = await upsert;
        expect(error?.message).toContain('questionnaire_not_open');
      });
      const snapshot = (await questionnaire(qid)).answer_snapshot as { answers: { question_id: string }[] };
      expect(snapshot.answers.map((x) => x.question_id)).toEqual(['about']);
    },
    15000,
  );

  test('an upsert with a stale questions_version RAISEs stale_manifest', async () => {
    const { qid } = await submitReady();
    const { error } = await upsertAnswer(qid, 'goal', 'leads', null, 2);
    expect(error?.message).toContain('stale_manifest');
  });

  test('answers cannot be deleted after send, while deleting the questionnaire row still cascades', async () => {
    const { qid } = await submitReady();
    const { error: delErr } = await svc.from('engagement_questionnaire_answers').delete().eq('questionnaire_id', qid);
    expect(delErr?.message).toContain('questionnaire_answers_locked');
    const { data: still } = await svc.from('engagement_questionnaire_answers').select('id').eq('questionnaire_id', qid);
    expect(still!.length).toBe(1);

    const { error: qDel } = await svc.from('engagement_questionnaires').delete().eq('id', qid);
    expect(qDel).toBeNull();
    const { data: gone } = await svc.from('engagement_questionnaire_answers').select('id').eq('questionnaire_id', qid);
    expect(gone ?? []).toEqual([]);
  });

  test('answers CAN be cleared while draft/ready (the manifest-save path)', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    expect((await upsertAnswer(qid, 'about', 'test fill')).error).toBeNull();
    const { error } = await svc.from('engagement_questionnaire_answers').delete().eq('questionnaire_id', qid);
    expect(error).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Submit
// ────────────────────────────────────────────────────────────────────────────
describe('submit_engagement_questionnaire', () => {
  test('required_missing is raised with the offending ids', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    await sendQuestionnaire(qid);
    // An "other" without text is not a present answer either.
    await upsertAnswer(qid, 'goal', '__other', null);
    const { error } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    expect(error?.message).toContain('required_missing');
    expect(error?.message).toContain('about');
    expect((await questionnaire(qid)).status).toBe('sent');
    expect(await briefs(eid)).toEqual([]);
  });

  test('is refused (not_open) for a draft/ready questionnaire without changing anything', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    await upsertAnswer(qid, 'about', 'draft fill');
    const { data, error } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    expect(error).toBeNull();
    expect(data).toEqual({ applied: false, reason: 'not_open' });
    expect((await questionnaire(qid)).status).toBe('draft');
  });

  test('success: status flips, snapshot = manifest + answers, one attention event, one generating brief; replay is a no-op', async () => {
    const { eid, qid } = await submitReady();
    await upsertAnswer(qid, 'goal', '__other', 'Hire staff');

    const { data, error } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    expect(error).toBeNull();
    const result = data as { applied: boolean; engagement_id: string; brief_id: string };
    expect(result.applied).toBe(true);
    expect(result.engagement_id).toBe(eid);

    const q = await questionnaire(qid);
    expect(q.status).toBe('submitted');
    expect(q.submitted_at).not.toBeNull();
    expect(q.notification_sent_at).toBeNull();
    const snapshot = q.answer_snapshot as Record<string, unknown>;
    expect(snapshot).toMatchObject({
      questions_version: 1,
      locale: 'en',
      title: 'Discovery questionnaire',
      sections: MANIFEST.sections,
      questions: MANIFEST.questions,
    });
    expect(snapshot.answers).toEqual([
      { question_id: 'about', answer: 'A family-run café in Kailua.', other_text: null },
      { question_id: 'goal', answer: '__other', other_text: 'Hire staff' },
    ]);

    const submitted = (await events(eid)).filter((e) => e.kind === 'questionnaire_submitted');
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({ actor: 'client', needs_attention: true, resolved_at: null });

    const bs = await briefs(eid);
    expect(bs).toHaveLength(1);
    expect(bs[0]).toMatchObject({ id: result.brief_id, status: 'generating', questionnaire_id: qid });

    // Replay.
    const { data: again, error: againErr } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    expect(againErr).toBeNull();
    expect(again).toEqual({ applied: false, reason: 'not_open' });
    const after = await questionnaire(qid);
    expect(after.submitted_at).toBe(q.submitted_at);
    expect(after.answer_snapshot).toEqual(q.answer_snapshot);
    expect((await events(eid)).filter((e) => e.kind === 'questionnaire_submitted')).toHaveLength(1);
    expect(await briefs(eid)).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Crash points + brief lifecycle
// ────────────────────────────────────────────────────────────────────────────
describe('crash points', () => {
  test('after a successful RPC with no follow-up work, the brief sits at generating and the stale flip moves it to failed', async () => {
    const { eid, qid } = await submitReady();
    const { data } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    const briefId = (data as { brief_id: string }).brief_id;

    // Same predicate flipStaleBriefs (lib/studio/engagement, slice 2) uses —
    // the audit engine's flipStaleAudits with a 7-minute cutoff. Backdate the
    // claim row instead of waiting.
    const STALE_MINUTES = 7;
    const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
    const flip = () =>
      svc
        .from('engagement_briefs')
        .update({ status: 'failed', generation_error: 'timeout', completed_at: new Date().toISOString() })
        .eq('engagement_id', eid)
        .eq('status', 'generating')
        .lt('created_at', cutoff)
        .select('id');

    const { data: fresh } = await flip();
    expect(fresh).toEqual([]); // not stale yet
    expect((await briefs(eid))[0].status).toBe('generating');

    await svc.from('engagement_briefs').update({ created_at: new Date(Date.now() - 10 * 60_000).toISOString() }).eq('id', briefId);
    const { data: flipped } = await flip();
    expect(flipped).toEqual([{ id: briefId }]);
    expect((await briefs(eid))[0]).toMatchObject({ status: 'failed', generation_error: 'timeout' });

    // The "resend notification" query the panel uses returns the row.
    const { data: resend } = await svc
      .from('engagement_questionnaires')
      .select('id')
      .eq('id', qid)
      .not('submitted_at', 'is', null)
      .is('notification_sent_at', null);
    expect(resend).toEqual([{ id: qid }]);
  });

  test('finalize_engagement_brief: contract checks, COALESCEd digest, events, and CAS replay', async () => {
    const { eid, qid } = await submitReady();
    const { data } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    const briefId = (data as { brief_id: string }).brief_id;

    // Phase 1 writes the digest while still generating (a fenced write).
    await svc.from('engagement_briefs').update({ digest_md: '# Digest' }).eq('id', briefId).eq('status', 'generating');

    const { error: incomplete } = await svc.rpc('finalize_engagement_brief', { p_brief_id: briefId, p_status: 'completed' });
    expect(incomplete?.message).toContain('completed requires');
    const { error: badStatus } = await svc.rpc('finalize_engagement_brief', { p_brief_id: briefId, p_status: 'done' });
    expect(badStatus).not.toBeNull();

    const { data: partial, error: partialErr } = await svc.rpc('finalize_engagement_brief', {
      p_brief_id: briefId,
      p_status: 'partial',
      p_digest_md: 'MUST NOT OVERWRITE',
      p_generation_error: 'provider_error',
    });
    expect(partialErr).toBeNull();
    expect(partial).toEqual({ applied: true });
    const b = (await briefs(eid))[0];
    expect(b).toMatchObject({ status: 'partial', digest_md: '# Digest', generation_error: 'provider_error' });
    expect(b.completed_at).not.toBeNull();
    const generated = (await events(eid)).filter((e) => e.kind === 'brief_generated');
    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({ actor: 'system', needs_attention: true });

    // Replay: already terminal -> applied:false, nothing else written.
    const { data: replay } = await svc.rpc('finalize_engagement_brief', {
      p_brief_id: briefId,
      p_status: 'failed',
      p_generation_error: 'internal',
    });
    expect(replay).toEqual({ applied: false });
    expect((await briefs(eid))[0].status).toBe('partial');
    expect((await events(eid)).filter((e) => String(e.kind).startsWith('brief_'))).toHaveLength(1);

    // A completed run needs the full payload and keeps the original digest.
    const { data: second } = await svc.from('engagement_briefs').insert({ engagement_id: eid, questionnaire_id: qid, digest_md: 'D2' }).select('id').single();
    const { data: done, error: doneErr } = await svc.rpc('finalize_engagement_brief', {
      p_brief_id: second!.id,
      p_status: 'completed',
      p_digest_md: 'ignored',
      p_brief_md: '## Brief',
      p_structured: { one_liner: 'x' },
      p_source_snapshot: { truncated: null },
      p_model_id: 'claude-sonnet-5',
      p_pipeline_version: 'brief-v1',
    });
    expect(doneErr).toBeNull();
    expect(done).toEqual({ applied: true });
    expect((await briefs(eid))[1]).toMatchObject({ status: 'completed', digest_md: 'D2', brief_md: '## Brief' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Reopen
// ────────────────────────────────────────────────────────────────────────────
describe('reopen', () => {
  test('submitted -> in_progress retains the snapshot, is refused while a brief is generating, and a resubmit overwrites it with a second brief', async () => {
    const { eid, qid } = await submitReady();
    const { data } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    const briefId = (data as { brief_id: string }).brief_id;
    const first = await questionnaire(qid);

    const { error: refused } = await svc.from('engagement_questionnaires').update({ status: 'in_progress' }).eq('id', qid);
    expect(refused?.message).toContain('brief_in_flight');
    // "Start over" (-> draft) is the same exit from submitted and is refused too.
    const { error: startOver } = await svc.from('engagement_questionnaires').update({ status: 'draft' }).eq('id', qid);
    expect(startOver?.message).toContain('brief_in_flight');
    expect((await questionnaire(qid)).status).toBe('submitted');

    await svc.rpc('finalize_engagement_brief', { p_brief_id: briefId, p_status: 'failed', p_generation_error: 'timeout' });
    const { error: reopened } = await svc.from('engagement_questionnaires').update({ status: 'in_progress' }).eq('id', qid);
    expect(reopened).toBeNull();
    const mid = await questionnaire(qid);
    expect(mid.status).toBe('in_progress');
    expect(mid.answer_snapshot).toEqual(first.answer_snapshot);

    expect((await upsertAnswer(qid, 'about', 'Revised answer')).error).toBeNull();
    const { data: again, error: againErr } = await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    expect(againErr).toBeNull();
    expect((again as { applied: boolean }).applied).toBe(true);
    const last = await questionnaire(qid);
    expect(last.answer_snapshot).not.toEqual(first.answer_snapshot);
    expect((last.answer_snapshot as { answers: { answer: unknown }[] }).answers[0].answer).toBe('Revised answer');
    expect(await briefs(eid)).toHaveLength(2);
    expect((await events(eid)).filter((e) => e.kind === 'questionnaire_submitted')).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Events, token hygiene, the remaining RPCs, the view
// ────────────────────────────────────────────────────────────────────────────
describe('engagement_events', () => {
  test('stage_changed carries correct from/to', async () => {
    const eid = await start(LEAD.qualified);
    await setStage(eid, 'proposal');
    await setStage(eid, 'build');
    const evs = (await events(eid)).filter((e) => e.kind === 'stage_changed');
    expect(evs.map((e) => [e.from_stage, e.to_stage])).toEqual([
      [null, 'discovery'],
      ['discovery', 'proposal'],
      ['proposal', 'build'],
    ]);
    // Same-value writes do not log a phantom transition.
    await setStage(eid, 'build');
    expect((await events(eid)).filter((e) => e.kind === 'stage_changed')).toHaveLength(3);
  });

  test('updating anything but resolved_at RAISEs; resolved_at alone is allowed', async () => {
    const eid = await start(LEAD.qualified);
    const { data: ev } = await svc
      .from('engagement_events')
      .insert({ engagement_id: eid, kind: 'note', summary: 'original', needs_attention: true })
      .select('id')
      .single();
    const { error: summaryErr } = await svc.from('engagement_events').update({ summary: 'edited' }).eq('id', ev!.id);
    expect(summaryErr?.message).toContain('engagement_events_append_only');
    const { error: kindErr } = await svc.from('engagement_events').update({ kind: 'stage_changed', to_stage: 'build' }).eq('id', ev!.id);
    expect(kindErr).not.toBeNull();
    const { error: okErr } = await svc.from('engagement_events').update({ resolved_at: new Date().toISOString() }).eq('id', ev!.id);
    expect(okErr).toBeNull();
    // resolved_at on a non-attention event violates the shape CHECK.
    const { error: shapeErr } = await svc
      .from('engagement_events')
      .insert({ engagement_id: eid, kind: 'note', summary: 'x', needs_attention: false, resolved_at: new Date().toISOString() });
    expect(shapeErr).not.toBeNull();
  });
});

describe('token hygiene', () => {
  test('after send the row holds only a 64-hex hash; a raw token is rejected; no event data carries a 64-hex string', async () => {
    const { eid, qid, token, hash } = await submitReady();
    await svc.rpc('touch_engagement_questionnaire_open', { p_questionnaire_id: qid });
    await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });

    const q = await questionnaire(qid);
    expect(q.access_token_hash).toBe(hash);
    expect(q.access_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(q.access_token_hash).not.toBe(token);
    for (const key of Object.keys(q)) {
      expect(String(q[key]), key).not.toContain(token);
    }

    const { error: raw } = await svc.from('engagement_questionnaires').update({ access_token_hash: 'not-a-hash' }).eq('id', qid);
    expect(raw).not.toBeNull();
    const { error: halfToken } = await svc
      .from('engagement_questionnaires')
      .update({ access_token_hash: null, token_issued_at: new Date().toISOString() })
      .eq('id', qid);
    expect(halfToken).not.toBeNull(); // token record is all-or-nothing

    const evs = await events(eid);
    expect(evs.length).toBeGreaterThan(1);
    for (const e of evs) {
      expect(JSON.stringify(e.data)).not.toMatch(/[0-9a-f]{64}/);
      expect(String(e.summary)).not.toMatch(/[0-9a-f]{64}/);
    }
  });
});

describe('touch_engagement_questionnaire_open', () => {
  test('first open flips sent -> in_progress and logs once; repeat opens only count', async () => {
    const { eid, qid } = await submitReady();
    const { data: first, error } = await svc.rpc('touch_engagement_questionnaire_open', { p_questionnaire_id: qid });
    expect(error).toBeNull();
    expect(first).toEqual({ first_open: true });
    let q = await questionnaire(qid);
    expect(q).toMatchObject({ status: 'in_progress', open_count: 1 });
    expect(q.first_opened_at).not.toBeNull();

    const { data: second } = await svc.rpc('touch_engagement_questionnaire_open', { p_questionnaire_id: qid });
    expect(second).toEqual({ first_open: false });
    q = await questionnaire(qid);
    expect(q.open_count).toBe(2);
    expect(q.last_opened_at).not.toBeNull();
    expect((await events(eid)).filter((e) => e.kind === 'questionnaire_opened')).toHaveLength(1);

    const { error: missing } = await svc.rpc('touch_engagement_questionnaire_open', { p_questionnaire_id: ZERO_UUID });
    expect(missing?.message).toContain('questionnaire_not_found');
  });
});

describe('finalize_engagement_questionnaire_tailoring', () => {
  test('completed replaces the manifest, bumps the version, clears answers, logs; refuses a non-draft; CAS replay', async () => {
    const eid = await start(LEAD.qualified);
    const qid = await seedQuestionnaire(eid);
    expect((await upsertAnswer(qid, 'about', 'throwaway test fill')).error).toBeNull();
    await svc.from('engagement_questionnaires').update({ tailoring_status: 'generating', tailoring_started_at: new Date().toISOString() }).eq('id', qid);

    const newQuestions = [{ ...MANIFEST.questions[0], id: 'about_v2', prompt: 'Tailored prompt' }];
    const { data, error } = await svc.rpc('finalize_engagement_questionnaire_tailoring', {
      p_questionnaire_id: qid,
      p_status: 'completed',
      p_sections: MANIFEST.sections,
      p_questions: newQuestions,
      p_model_id: 'claude-sonnet-5',
      p_pipeline_version: 'tailor-v1',
    });
    expect(error).toBeNull();
    expect(data).toEqual({ applied: true });
    const q = await questionnaire(qid);
    expect(q).toMatchObject({ questions_version: 2, tailoring_status: 'completed', tailoring_model_id: 'claude-sonnet-5', status: 'draft' });
    expect(q.questions).toEqual(newQuestions);
    const { data: answers } = await svc.from('engagement_questionnaire_answers').select('id').eq('questionnaire_id', qid);
    expect(answers ?? []).toEqual([]);
    expect((await events(eid)).filter((e) => e.kind === 'questionnaire_tailored')).toHaveLength(1);

    // Replay: no longer generating.
    const { data: replay } = await svc.rpc('finalize_engagement_questionnaire_tailoring', {
      p_questionnaire_id: qid,
      p_status: 'failed',
      p_tailoring_error: 'timeout',
    });
    expect(replay).toEqual({ applied: false });
    expect((await questionnaire(qid)).tailoring_status).toBe('completed');

    // A sent instance is never overwritten.
    await sendQuestionnaire(qid);
    await svc.from('engagement_questionnaires').update({ tailoring_status: 'generating', tailoring_started_at: new Date().toISOString() }).eq('id', qid);
    const { error: notDraft } = await svc.rpc('finalize_engagement_questionnaire_tailoring', {
      p_questionnaire_id: qid,
      p_status: 'completed',
      p_sections: MANIFEST.sections,
      p_questions: newQuestions,
      p_model_id: 'm',
      p_pipeline_version: 'v',
    });
    expect(notDraft?.message).toContain('questionnaire_not_draft');
    expect((await questionnaire(qid)).questions_version).toBe(2);

    // failed path
    const { data: failed } = await svc.rpc('finalize_engagement_questionnaire_tailoring', {
      p_questionnaire_id: qid,
      p_status: 'failed',
      p_tailoring_error: 'provider_error',
    });
    expect(failed).toEqual({ applied: true });
    expect(await questionnaire(qid)).toMatchObject({ tailoring_status: 'failed', tailoring_error: 'provider_error' });
  });
});

describe('engagement_list view', () => {
  test('pre-aggregates discovery progress, last activity and open attention per engagement', async () => {
    const { eid, qid } = await submitReady();
    await upsertAnswer(qid, 'goal', 'leads');
    const admin = await userClient(USERS.honuvibe_admin);
    const { data, error } = await admin.from('engagement_list').select('*').eq('id', eid).single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      stage: 'discovery',
      discovery_id: qid,
      discovery_status: 'sent',
      discovery_question_count: 2,
      discovery_answered_count: 2,
      latest_brief_status: null,
      open_attention_count: 0,
    });
    expect(data!.last_activity_at).not.toBeNull();

    await svc.rpc('submit_engagement_questionnaire', { p_questionnaire_id: qid });
    const { data: after } = await admin.from('engagement_list').select('*').eq('id', eid).single();
    expect(after).toMatchObject({ discovery_status: 'submitted', latest_brief_status: 'generating', open_attention_count: 1 });

    // An engagement without a questionnaire reads as zeros, not nulls.
    const bare = await start(LEAD.q3);
    const { data: empty } = await admin.from('engagement_list').select('*').eq('id', bare).single();
    expect(empty).toMatchObject({ discovery_id: null, discovery_question_count: 0, discovery_answered_count: 0 });
  });
});
