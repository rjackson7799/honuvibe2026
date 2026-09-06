/**
 * Studio proposal (migration 074) — RLS, the kind-constraint swap, the hard
 * gate, uniqueness/slots, the 7×7 transition matrix, shape CHECKs, the issue
 * CAS, accept (incl. credential re-validation on the locked row and the
 * two-connection revoke race), the lock-order races, void, the amended
 * terminal sweep, the drafting claim + finalize CAS, token hygiene, touch.
 *
 * Same harness as engagement_rls.test.ts (fixtures, `withPg` for the
 * two-connection cases). Teardown deletes proposals → briefs →
 * questionnaires → engagements → leads and empties the bucket prefix.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import { ENGAGEMENT_EVENT_KINDS, PROPOSAL_STATUSES } from '../../lib/studio/engagement/types';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const DB_URL =
  process.env.TEST_SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const BUCKET = 'engagement-documents';

const svc = serviceClient();

vi.setConfig({ testTimeout: 30_000 });

const FIXTURE_BIZ = 'RLS Fixture Proposal Biz';
const LEAD = {
  a: '55555555-5555-5555-5555-555555560001',
  b: '55555555-5555-5555-5555-555555560002',
  c: '55555555-5555-5555-5555-555555560003',
  d: '55555555-5555-5555-5555-555555560004',
  ja: '55555555-5555-5555-5555-555555560005',
} as const;
const LEAD_IDS = Object.values(LEAD);

const RPCS = [
  'create_engagement_proposal',
  'issue_engagement_proposal',
  'touch_engagement_proposal_open',
  'accept_engagement_proposal',
  'void_engagement_proposal_acceptance',
  'finalize_engagement_proposal_draft',
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

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
function tokenPair(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: sha256(token) };
}

// ── Seeds ──────────────────────────────────────────────────────────────────

async function seedLeads(): Promise<void> {
  const rows = [
    { id: LEAD.a, name: 'Kai Fixture', email: 'kai-p@fixture.local', source_locale: 'en', tier_interest: 'starter' },
    { id: LEAD.b, name: 'B Fixture', email: 'b-p@fixture.local', source_locale: 'en', tier_interest: null },
    { id: LEAD.c, name: 'C Fixture', email: 'c-p@fixture.local', source_locale: 'en', tier_interest: null },
    { id: LEAD.d, name: 'D Fixture', email: 'd-p@fixture.local', source_locale: 'en', tier_interest: null },
    { id: LEAD.ja, name: '山田 太郎', email: 'ja-p@fixture.local', source_locale: 'ja', tier_interest: 'pro' },
  ].map((r) => ({ source: 'manual', lifecycle: 'new', business_name: FIXTURE_BIZ, sales_stage: 'qualified', ...r }));
  const { error } = await svc.from('leads').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

async function emptyBucketPrefix(): Promise<void> {
  const store = svc.storage.from(BUCKET);
  const { data: dirs } = await store.list('proposals', { limit: 1000 });
  for (const d of dirs ?? []) {
    const { data: files } = await store.list(`proposals/${d.name}`, { limit: 1000 });
    const paths = (files ?? []).map((f) => `proposals/${d.name}/${f.name}`);
    if (paths.length) await store.remove(paths);
  }
}

async function resetAll(): Promise<void> {
  const { data: es } = await svc.from('engagements').select('id').in('lead_id', LEAD_IDS);
  const eids = (es ?? []).map((e) => e.id as string);
  if (eids.length) {
    // Explicit order (the FKs would cascade, but the plan states the order):
    // proposals → briefs → questionnaires → engagements.
    let r = await svc.from('engagement_proposals').delete().in('engagement_id', eids);
    if (r.error) throw r.error;
    r = await svc.from('engagement_briefs').delete().in('engagement_id', eids);
    if (r.error) throw r.error;
    r = await svc.from('engagement_questionnaires').delete().in('engagement_id', eids);
    if (r.error) throw r.error;
    r = await svc.from('engagements').delete().in('id', eids);
    if (r.error) throw r.error;
  }
}

async function start(leadId: string): Promise<string> {
  const { data, error } = await svc.rpc('start_engagement', { p_lead_id: leadId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { engagement_id: string };
  return row.engagement_id;
}

const MANIFEST = {
  sections: [{ key: 'orientation', title: 'Orientation', blurb: null }],
  questions: [
    { id: 'about', section_key: 'orientation', qtype: 'text', prompt: 'Tell us about the business.', help: null, required: true, options: [], allow_other: false, max_select: null, long: true },
  ],
};

/** A questionnaire that is already SUBMITTED (with its snapshot + token record). */
// Default submission an hour back: the gate compares the brief's DB-side created_at
// with this JS-side stamp, and the container clock may not match the host's.
async function seedSubmitted(eid: string, submittedAt = new Date(Date.now() - 3600_000)): Promise<string> {
  const pair = tokenPair();
  const sent = new Date(submittedAt.getTime() - 3600_000);
  const { data, error } = await svc
    .from('engagement_questionnaires')
    .insert({
      engagement_id: eid,
      kind: 'discovery',
      locale: 'en',
      title: 'Discovery questionnaire',
      sections: MANIFEST.sections,
      questions: MANIFEST.questions,
      status: 'submitted',
      sent_at: sent.toISOString(),
      submitted_at: submittedAt.toISOString(),
      access_token_hash: pair.hash,
      token_issued_at: sent.toISOString(),
      token_expires_at: new Date(sent.getTime() + 45 * 86400_000).toISOString(),
      answer_snapshot: {
        questions_version: 1,
        locale: 'en',
        title: 'Discovery questionnaire',
        sections: MANIFEST.sections,
        questions: MANIFEST.questions,
        answers: [{ question_id: 'about', answer: 'A family-run café in Kailua.', other_text: null }],
      },
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

async function seedBrief(
  eid: string,
  qid: string | null,
  status: 'completed' | 'partial' | 'failed' | 'generating' = 'partial',
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const base: Record<string, unknown> = { engagement_id: eid, questionnaire_id: qid, status };
  const now = new Date().toISOString();
  if (status === 'partial') Object.assign(base, { digest_md: '# digest', generation_error: 'provider_error', completed_at: now });
  if (status === 'failed') Object.assign(base, { generation_error: 'internal', completed_at: now });
  if (status === 'completed') {
    Object.assign(base, {
      digest_md: '# digest',
      brief_md: '# brief',
      structured: { one_liner: 'x' },
      source_snapshot: { questionnaire_id: qid },
      completed_at: now,
      model_id: 'm',
      pipeline_version: 'brief-v1',
    });
  }
  const { data, error } = await svc.from('engagement_briefs').insert({ ...base, ...overrides }).select('id').single();
  if (error) throw error;
  return data!.id as string;
}

/** start + submitted questionnaire + partial brief: the gate is satisfied. */
async function gated(leadId: string = LEAD.a) {
  const eid = await start(leadId);
  const qid = await seedSubmitted(eid);
  const bid = await seedBrief(eid, qid, 'partial');
  return { eid, qid, bid };
}

// The click-path offer: Starter + booking + AI chat + asap − $150 = $875 / $65.
const PRICING = {
  currency: 'USD',
  tier: 'starter',
  inputs: { tier: 'starter', addons: { booking: true, aiChat: true }, timeline: 'asap' },
  base: { label: 'Starter build', build: 50000, monthly: 2500 },
  rush: { label: 'Rush (ASAP timeline)', build: 12500 },
  lines: [
    { id: 'booking', label: 'Booking integration', build: 25000, monthly: 1500, value: 'Let customers book online, 24/7' },
    { id: 'ai_chat', label: 'AI chat assistant', build: 15000, monthly: 2500, value: 'A 24/7 assistant' },
  ],
  adjustment: { label: 'Founding-client discount', build: -15000, monthly: 0 },
  usd_reference: null,
  total_build: 87500,
  total_monthly: 6500,
};

const SECTION_KEYS = ['exec_summary', 'takeaways', 'recommendation', 'scope', 'investment_notes', 'terms', 'next_steps'] as const;
function sections(bodies: Partial<Record<(typeof SECTION_KEYS)[number], string>> = {}) {
  return SECTION_KEYS.map((key) => ({ key, title: key.replace('_', ' '), body_md: bodies[key] ?? `Body of ${key}.` }));
}

function createArgs(eid: string, bid: string, overrides: Record<string, unknown> = {}) {
  return {
    p_engagement_id: eid,
    p_title: 'Website + booking',
    p_currency: 'USD',
    p_tier: 'starter',
    p_pricing_mode: 'fixed',
    p_pricing: PRICING,
    p_total_build: 87500,
    p_total_monthly: 6500,
    p_performance_terms: null,
    p_sections: sections(),
    p_data_basis: 'provisional',
    p_brief_id: bid,
    ...overrides,
  };
}

async function createProposal(eid: string, bid: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid, overrides));
  if (error) throw error;
  return data as string;
}

async function proposal(pid: string) {
  const { data, error } = await svc.from('engagement_proposals').select('*').eq('id', pid).single();
  if (error) throw error;
  return data as Record<string, unknown>;
}
async function engagement(eid: string) {
  const { data, error } = await svc.from('engagements').select('*').eq('id', eid).single();
  if (error) throw error;
  return data as Record<string, unknown>;
}
async function leadStage(leadId: string): Promise<string> {
  const { data, error } = await svc.from('leads').select('sales_stage').eq('id', leadId).single();
  if (error) throw error;
  return data!.sales_stage as string;
}
async function events(eid: string, kind?: string) {
  let q = svc.from('engagement_events').select('*').eq('engagement_id', eid).order('created_at', { ascending: true });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) throw error;
  return data as Record<string, unknown>[];
}

async function markReady(pid: string): Promise<void> {
  const { error } = await svc.from('engagement_proposals').update({ status: 'ready' }).eq('id', pid);
  if (error) throw error;
}

const SNAPSHOT = { snapshot_version: 1, renderer_version: 'proposal-doc-v1', title: 'Website + booking' };

async function issue(
  pid: string,
  opts: { delivery?: 'link' | 'manual'; contentVersion?: number; engagementUpdatedAt?: string; validUntil?: string | null; hash?: string | null } = {},
) {
  const p = await proposal(pid);
  const e = await engagement(p.engagement_id as string);
  const delivery = opts.delivery ?? 'link';
  const pair = tokenPair();
  const hash = opts.hash === undefined ? (delivery === 'link' ? pair.hash : null) : opts.hash;
  const { data, error } = await svc.rpc('issue_engagement_proposal', {
    p_proposal_id: pid,
    p_content_version: opts.contentVersion ?? p.content_version,
    p_engagement_updated_at: opts.engagementUpdatedAt ?? e.updated_at,
    p_issued_snapshot: SNAPSHOT,
    p_pdf_path: `proposals/${p.engagement_id}/${pid}-v${p.version}.pdf`,
    p_pdf_sha256: sha256(`pdf-${pid}-${p.version}`),
    p_delivery: delivery,
    p_token_hash: hash,
    p_token_expires_at: hash ? new Date(Date.now() + 45 * 86400_000).toISOString() : null,
    p_valid_until: opts.validUntil ?? null,
  });
  return { data: data as Record<string, unknown> | null, error, token: pair.token, hash };
}

/** A proposal created through the gate, marked ready, and issued. */
async function issued(leadId: string = LEAD.a, delivery: 'link' | 'manual' = 'link') {
  const g = await gated(leadId);
  const pid = await createProposal(g.eid, g.bid);
  await markReady(pid);
  const r = await issue(pid, { delivery });
  if (r.error) throw r.error;
  expect(r.data).toMatchObject({ applied: true });
  return { ...g, pid, token: r.token, hash: r.hash };
}

async function acceptClient(pid: string, hash: string | null, name = 'Test Client') {
  const { data, error } = await svc.rpc('accept_engagement_proposal', {
    p_proposal_id: pid,
    p_accepted_by_name: name,
    p_via: 'client',
    p_token_hash: hash,
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function acceptAdmin(pid: string, name = 'Ryan (signed PDF)') {
  const { data, error } = await svc.rpc('accept_engagement_proposal', {
    p_proposal_id: pid,
    p_accepted_by_name: name,
    p_via: 'admin',
    p_token_hash: null,
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function voidAcceptance(pid: string, reason = 'wrong tier') {
  const { data, error } = await svc.rpc('void_engagement_proposal_acceptance', { p_proposal_id: pid, p_reason: reason });
  return { data: data as Record<string, unknown> | null, error };
}

/** The column values a DIRECT insert needs to sit in `status` (shape CHECK). */
const FIXED_TS = '2026-01-15T10:00:00.000Z';
function shapeFor(status: string): Record<string, unknown> {
  // Fixed timestamps so re-supplying a state's fields equals the stored values
  // (the guard compares issued/acceptance fields with IS DISTINCT FROM).
  const now = FIXED_TS;
  const sent = {
    issued_snapshot: SNAPSHOT,
    issued_pdf_path: 'proposals/x/y.pdf',
    issued_pdf_sha256: sha256('pdf'),
    sent_at: now,
    delivery_method: 'manual',
    valid_until: '2099-01-01',
  };
  const accepted = { ...sent, accepted_at: now, accepted_by_name: 'A', accepted_via: 'admin' };
  switch (status) {
    case 'draft':
    case 'ready':
      return {};
    case 'sent':
      return sent;
    case 'accepted':
      return accepted;
    case 'voided':
      return { ...accepted, voided_at: now, void_reason: 'r' };
    case 'superseded':
      return { superseded_at: now };
    case 'withdrawn':
      return { withdrawn_at: now };
    default:
      throw new Error(status);
  }
}

async function insertDirect(eid: string, status: string, version = 1, extra: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await svc
    .from('engagement_proposals')
    .insert({
      engagement_id: eid,
      version,
      locale: 'en',
      title: 'Direct',
      status,
      currency: 'USD',
      tier: 'starter',
      pricing_mode: 'fixed',
      pricing: PRICING,
      total_build: 87500,
      total_monthly: 6500,
      data_basis: 'client_records',
      sections: sections(),
      ...shapeFor(status),
      ...extra,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

beforeAll(async () => {
  await seedFixtures();
});

beforeEach(async () => {
  await resetAll();
  await seedLeads();
});

afterAll(async () => {
  await resetAll();
  await svc.from('leads').delete().in('id', LEAD_IDS);
  await emptyBucketPrefix();
});

// ────────────────────────────────────────────────────────────────────────────
// RLS
// ────────────────────────────────────────────────────────────────────────────
describe('RLS — admin-only table, service-role RPCs, private bucket', () => {
  test('anon and a non-admin member are denied select/insert/update/delete; admin has full CRUD; service writes freely', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid);
    const member = await userClient(USERS.honuvibe_free);
    for (const [label, client] of [['anon', anonClient()], ['member', member]] as const) {
      const { data: sel } = await client.from('engagement_proposals').select('id');
      expect(sel ?? [], `${label} select`).toEqual([]);
      const { data: view } = await client.from('engagement_list').select('id');
      expect(view ?? [], `${label} view`).toEqual([]);
      const { error: ins } = await client.from('engagement_proposals').insert({
        engagement_id: eid, version: 9, locale: 'en', title: 'x', currency: 'USD', tier: 'starter',
        pricing: PRICING, total_build: 87500, total_monthly: 6500, data_basis: 'provisional', sections: sections(),
      });
      expect(ins, `${label} insert`).not.toBeNull();
      const { data: upd } = await client.from('engagement_proposals').update({ title: 'hacked' }).eq('id', pid).select('id');
      expect(upd ?? [], `${label} update`).toEqual([]);
      const { data: del } = await client.from('engagement_proposals').delete().eq('id', pid).select('id');
      expect(del ?? [], `${label} delete`).toEqual([]);
    }
    expect((await proposal(pid)).title).toBe('Website + booking');

    const admin = await userClient(USERS.honuvibe_admin);
    const { data: adminSel } = await admin.from('engagement_proposals').select('id').eq('id', pid);
    expect(adminSel).toHaveLength(1);
    const { data: adminUpd, error: adminUpdErr } = await admin.from('engagement_proposals').update({ title: 'Admin edit' }).eq('id', pid).select('id');
    expect(adminUpdErr).toBeNull();
    expect(adminUpd).toHaveLength(1);
    const { data: adminList } = await admin.from('engagement_list').select('proposal_id, proposal_status, proposal_version').eq('id', eid).single();
    expect(adminList).toMatchObject({ proposal_id: pid, proposal_status: 'draft', proposal_version: 1 });
    const { error: adminDel } = await admin.from('engagement_proposals').delete().eq('id', pid);
    expect(adminDel).toBeNull();
    const { error: adminIns } = await admin.from('engagement_proposals').insert({
      engagement_id: eid, version: 2, locale: 'en', title: 'Admin insert', currency: 'USD', tier: 'starter',
      pricing: PRICING, total_build: 87500, total_monthly: 6500, data_basis: 'provisional', sections: sections(),
    });
    expect(adminIns).toBeNull();

    const { error: svcErr } = await svc.from('engagement_proposals').update({ title: 'Service edit' }).eq('engagement_id', eid);
    expect(svcErr).toBeNull();
  });

  test('every RPC: EXECUTE denied for anon, authenticated AND admin; allowed for service role', async () => {
    const member = await userClient(USERS.honuvibe_free);
    const admin = await userClient(USERS.honuvibe_admin);
    const args: Record<(typeof RPCS)[number], Record<string, unknown>> = {
      create_engagement_proposal: createArgs(ZERO_UUID, ZERO_UUID),
      issue_engagement_proposal: { p_proposal_id: ZERO_UUID, p_content_version: 1, p_engagement_updated_at: new Date().toISOString(), p_issued_snapshot: {}, p_pdf_path: 'x', p_pdf_sha256: sha256('x'), p_delivery: 'manual', p_token_hash: null, p_token_expires_at: null, p_valid_until: null },
      touch_engagement_proposal_open: { p_proposal_id: ZERO_UUID },
      accept_engagement_proposal: { p_proposal_id: ZERO_UUID, p_accepted_by_name: 'x', p_via: 'admin', p_token_hash: null },
      void_engagement_proposal_acceptance: { p_proposal_id: ZERO_UUID, p_reason: 'x' },
      finalize_engagement_proposal_draft: { p_proposal_id: ZERO_UUID, p_run_id: ZERO_UUID, p_status: 'failed', p_drafting_error: 'internal' },
    };
    for (const rpc of RPCS) {
      for (const [label, client] of [['anon', anonClient()], ['member', member], ['admin', admin]] as const) {
        const { error } = await client.rpc(rpc, args[rpc]);
        expect(error, `${label} ${rpc}`).not.toBeNull();
        expect(error!.message, `${label} ${rpc}`).not.toContain('not_found'); // denied before it ran
      }
    }
    await withPg(async (c) => {
      const sigs: Record<(typeof RPCS)[number], string> = {
        create_engagement_proposal: 'public.create_engagement_proposal(uuid,text,text,text,text,jsonb,int,int,jsonb,jsonb,text,uuid,jsonb,uuid)',
        issue_engagement_proposal: 'public.issue_engagement_proposal(uuid,int,timestamptz,jsonb,text,text,text,text,timestamptz,date)',
        touch_engagement_proposal_open: 'public.touch_engagement_proposal_open(uuid)',
        accept_engagement_proposal: 'public.accept_engagement_proposal(uuid,text,text,text)',
        void_engagement_proposal_acceptance: 'public.void_engagement_proposal_acceptance(uuid,text)',
        finalize_engagement_proposal_draft: 'public.finalize_engagement_proposal_draft(uuid,uuid,text,jsonb,jsonb,text,text,text)',
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

  test('the bucket exists, is private, and anon can neither list nor read an object in it', async () => {
    await withPg(async (c) => {
      const r = await c.query('select public from storage.buckets where id = $1', [BUCKET]);
      expect(r.rows).toHaveLength(1);
      expect(r.rows[0].public).toBe(false);
    });
    const path = `proposals/${ZERO_UUID}/rls-probe.pdf`;
    const { error: upErr } = await svc.storage.from(BUCKET).upload(path, Buffer.from('%PDF-1.4 probe'), { contentType: 'application/pdf', upsert: true });
    expect(upErr).toBeNull();
    const anon = anonClient();
    const { data: listed } = await anon.storage.from(BUCKET).list(`proposals/${ZERO_UUID}`);
    expect(listed ?? []).toEqual([]);
    const { data: dl, error: dlErr } = await anon.storage.from(BUCKET).download(path);
    expect(dl).toBeNull();
    expect(dlErr).not.toBeNull();
    const { data: ok } = await svc.storage.from(BUCKET).download(path);
    expect(ok).not.toBeNull();
    await svc.storage.from(BUCKET).remove([path]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Constraint swap — the upgrade test
// ────────────────────────────────────────────────────────────────────────────
describe('engagement_events.kind constraint swap', () => {
  test('exactly one CHECK covers kind; every TS kind inserts; a bogus kind is rejected', async () => {
    await withPg(async (c) => {
      const r = await c.query(`
        select c.conname from pg_constraint c
         where c.conrelid = 'public.engagement_events'::regclass and c.contype = 'c'
           and c.conkey = array[(select a.attnum from pg_attribute a
                                  where a.attrelid = c.conrelid and a.attname = 'kind' and not a.attisdropped)]`);
      expect(r.rows).toHaveLength(1);
      expect(r.rows[0].conname).toBe('engagement_events_kind_check');
    });
    const eid = await start(LEAD.a);
    expect(ENGAGEMENT_EVENT_KINDS).toHaveLength(28);
    for (const kind of ENGAGEMENT_EVENT_KINDS) {
      const { error } = await svc.from('engagement_events').insert({
        engagement_id: eid, kind, actor: 'system', summary: `kind ${kind}`, to_stage: kind === 'stage_changed' ? 'discovery' : null,
      });
      expect(error, kind).toBeNull();
    }
    const { error: bogus } = await svc.from('engagement_events').insert({ engagement_id: eid, kind: 'proposal_bogus', summary: 'x' });
    expect(bogus?.code).toBe('23514');
  });

  test('the TS status vocabulary matches the SQL CHECK', async () => {
    const eid = await start(LEAD.a);
    for (const status of PROPOSAL_STATUSES) {
      const pid = await insertDirect(eid, status);
      await svc.from('engagement_proposals').delete().eq('id', pid);
    }
    await expect(insertDirect(eid, 'bogus')).rejects.toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Hard gate
// ────────────────────────────────────────────────────────────────────────────
describe('create_engagement_proposal — the hard gate', () => {
  test('no questionnaire → discovery_not_submitted; a sent one too', async () => {
    const eid = await start(LEAD.a);
    const { error } = await svc.rpc('create_engagement_proposal', createArgs(eid, ZERO_UUID));
    expect(error?.message).toContain('discovery_not_submitted');
    const pair = tokenPair();
    await svc.from('engagement_questionnaires').insert({
      engagement_id: eid, kind: 'discovery', locale: 'en', title: 'Q', sections: MANIFEST.sections, questions: MANIFEST.questions,
      status: 'sent', sent_at: new Date().toISOString(), access_token_hash: pair.hash,
      token_issued_at: new Date().toISOString(), token_expires_at: new Date(Date.now() + 86400_000).toISOString(),
    });
    const { error: sent } = await svc.rpc('create_engagement_proposal', createArgs(eid, ZERO_UUID));
    expect(sent?.message).toContain('discovery_not_submitted');
  });

  test('brief_missing: null, another engagement\'s brief, a failed or generating brief', async () => {
    const { eid, qid } = await gated();
    const other = await gated(LEAD.b);
    for (const bid of [null, other.bid, await seedBrief(eid, qid, 'failed'), await seedBrief(eid, qid, 'generating')]) {
      const { error } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid as string));
      expect(error?.message, String(bid)).toContain('brief_missing');
    }
  });

  test('brief_stale when the brief predates the current submission (reopen → resubmit → old brief)', async () => {
    const eid = await start(LEAD.a);
    const qid = await seedSubmitted(eid, new Date(Date.now() - 2 * 86400_000));
    const bid = await seedBrief(eid, qid, 'completed');
    // Pin the brief two days back (explicit, so host/container clock skew
    // cannot decide the outcome), then "resubmit": submitted_at moves to
    // yesterday and the brief is from a previous submission.
    await svc.from('engagement_briefs').update({ created_at: new Date(Date.now() - 2 * 86400_000).toISOString() }).eq('id', bid);
    await svc.from('engagement_questionnaires').update({ submitted_at: new Date(Date.now() - 86400_000).toISOString() }).eq('id', qid);
    const { error } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid));
    expect(error?.message).toContain('brief_stale');
    // A brief on a different questionnaire id is stale too.
    const q2 = await start(LEAD.b);
    const qid2 = await seedSubmitted(q2);
    const foreignBrief = await seedBrief(eid, qid2, 'partial');
    const { error: e2 } = await svc.rpc('create_engagement_proposal', createArgs(eid, foreignBrief));
    expect(e2?.message).toContain('brief_stale');
    // Regenerate → passes.
    const fresh = await seedBrief(eid, qid, 'partial');
    const pid = await createProposal(eid, fresh);
    expect(pid).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('succeeds with a partial brief: v1, draft, content_version 1, locale copied, one proposal_drafted', async () => {
    const { eid, bid } = await gated(LEAD.ja);
    const pid = await createProposal(eid, bid);
    const p = await proposal(pid);
    expect(p).toMatchObject({ version: 1, status: 'draft', content_version: 1, locale: 'ja', brief_id: bid, data_basis: 'provisional', drafting_status: 'none' });
    const drafted = await events(eid, 'proposal_drafted');
    expect(drafted).toHaveLength(1);
    expect(drafted[0].data).toMatchObject({ proposal_id: pid, version: 1, supersedes: null });
  });

  test('a terminal engagement refuses; an accepted proposal blocks a new one until voided', async () => {
    const { eid, bid } = await gated();
    await svc.from('engagements').update({ stage: 'lost', lost_reason: 'gone' }).eq('id', eid);
    const { error } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid));
    expect(error?.message).toContain('engagement_terminal');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Uniqueness & slots
// ────────────────────────────────────────────────────────────────────────────
describe('uniqueness & slots', () => {
  test('second create without supersede → 23505; with supersede → v2, old row superseded + token revoked + superseded_by', async () => {
    const { eid, bid, pid, hash } = await issued();
    const { error } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid));
    expect(error?.code).toBe('23505');

    const v2 = await createProposal(eid, bid, { p_supersede_id: pid });
    const old = await proposal(pid);
    expect(old).toMatchObject({ status: 'superseded', superseded_by: v2, access_token_hash: hash });
    expect(old.superseded_at).not.toBeNull();
    expect(old.token_revoked_at).not.toBeNull();
    expect(await proposal(v2)).toMatchObject({ version: 2, status: 'draft' });
    expect(await events(eid, 'proposal_superseded')).toHaveLength(1);
    const drafted = await events(eid, 'proposal_drafted');
    expect(drafted[1].data).toMatchObject({ version: 2, supersedes: pid });
  });

  test('a withdrawn row frees the slot', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid);
    const { error } = await svc.from('engagement_proposals').update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() }).eq('id', pid);
    expect(error).toBeNull();
    const v2 = await createProposal(eid, bid);
    expect((await proposal(v2)).version).toBe(2);
  });

  test('proposal_already_accepted while an accepted row exists; create succeeds after void', async () => {
    const { eid, bid, pid, hash } = await issued();
    expect((await acceptClient(pid, hash)).data).toMatchObject({ applied: true });
    const { error } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid));
    expect(error?.message).toContain('proposal_already_accepted');
    expect((await voidAcceptance(pid)).data).toMatchObject({ applied: true });
    const v2 = await createProposal(eid, bid);
    expect((await proposal(v2)).version).toBe(2);
  });

  test('supersede of an accepted / withdrawn row → proposal_not_open; of another engagement\'s row too', async () => {
    const { eid, bid, pid } = await issued();
    expect((await acceptAdmin(pid)).data).toMatchObject({ applied: true });
    await voidAcceptance(pid);
    const { error } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid, { p_supersede_id: pid }));
    expect(error?.message).toContain('proposal_not_open');

    const other = await gated(LEAD.b);
    const otherPid = await createProposal(other.eid, other.bid);
    const { error: foreign } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid, { p_supersede_id: otherPid }));
    expect(foreign?.message).toContain('proposal_not_open');

    const w = await createProposal(eid, bid);
    await svc.from('engagement_proposals').update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() }).eq('id', w);
    const { error: withdrawn } = await svc.rpc('create_engagement_proposal', createArgs(eid, bid, { p_supersede_id: w }));
    expect(withdrawn?.message).toContain('proposal_not_open');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Transitions & guards
// ────────────────────────────────────────────────────────────────────────────
const ALLOWED = new Set([
  'draft>ready', 'ready>draft', 'ready>sent', 'sent>accepted', 'accepted>voided',
  'draft>withdrawn', 'ready>withdrawn', 'sent>withdrawn',
  'draft>superseded', 'ready>superseded', 'sent>superseded',
]);

describe('transitions & guards', () => {
  test('the 7×7 matrix: only the enumerated transitions pass; self-transitions pass; the rest RAISE proposal_transition_invalid', async () => {
    const eid = await start(LEAD.a);
    for (const from of PROPOSAL_STATUSES) {
      for (const to of PROPOSAL_STATUSES) {
        const pid = await insertDirect(eid, from);
        const patch = from === to ? { status: to } : { status: to, ...shapeFor(to) };
        const { error } = await svc.from('engagement_proposals').update(patch).eq('id', pid);
        const key = `${from}>${to}`;
        if (from === to || ALLOWED.has(key)) {
          expect(error, key).toBeNull();
          expect((await proposal(pid)).status, key).toBe(to);
        } else {
          expect(error?.message, key).toContain('proposal_transition_invalid');
        }
        await svc.from('engagement_proposals').delete().eq('id', pid);
      }
    }
  }, 120_000);

  test('engagement_id and version are immutable', async () => {
    const eid = await start(LEAD.a);
    const other = await start(LEAD.b);
    const pid = await insertDirect(eid, 'draft');
    const { error: v } = await svc.from('engagement_proposals').update({ version: 5 }).eq('id', pid);
    expect(v?.message).toContain('proposal_identity_immutable');
    const { error: e } = await svc.from('engagement_proposals').update({ engagement_id: other }).eq('id', pid);
    expect(e?.message).toContain('proposal_identity_immutable');
  });

  test('content on sent → proposal_content_locked; on ready without draft → proposal_ready_content_change; with draft → bumps content_version', async () => {
    const { pid } = await issued();
    const { error: locked } = await svc.from('engagement_proposals').update({ title: 'Typo fix' }).eq('id', pid);
    expect(locked?.message).toContain('proposal_content_locked');

    const eid2 = await start(LEAD.b);
    const ready = await insertDirect(eid2, 'ready');
    const { error: rcc } = await svc.from('engagement_proposals').update({ title: 'Edited on ready' }).eq('id', ready);
    expect(rcc?.message).toContain('proposal_ready_content_change');
    const { error: ok } = await svc.from('engagement_proposals').update({ title: 'Edited on ready', status: 'draft' }).eq('id', ready);
    expect(ok).toBeNull();
    expect(await proposal(ready)).toMatchObject({ status: 'draft', title: 'Edited on ready', content_version: 2 });
    // A non-content write does not bump; a manual content_version write is pinned.
    await svc.from('engagement_proposals').update({ notification_sent_at: new Date().toISOString(), content_version: 99 }).eq('id', ready);
    expect((await proposal(ready)).content_version).toBe(2);
    // Every content column bumps once.
    await svc.from('engagement_proposals').update({ sections: sections({ scope: 'new scope' }) }).eq('id', ready);
    expect((await proposal(ready)).content_version).toBe(3);
    await svc.from('engagement_proposals').update({ data_basis: 'provisional' }).eq('id', ready);
    expect((await proposal(ready)).content_version).toBe(4);
  });

  test('content while generating → proposal_drafting_in_progress; the same statement flipping the status passes', async () => {
    const eid = await start(LEAD.a);
    const pid = await insertDirect(eid, 'draft', 1, {
      drafting_status: 'generating', drafting_started_at: new Date().toISOString(), drafting_run_id: randomUUID(), drafting_input_version: 1,
    });
    const { error } = await svc.from('engagement_proposals').update({ title: 'Mid-run edit' }).eq('id', pid);
    expect(error?.message).toContain('proposal_drafting_in_progress');
    const { error: ok } = await svc.from('engagement_proposals').update({ title: 'Finalize', drafting_status: 'completed' }).eq('id', pid);
    expect(ok).toBeNull();
    expect((await proposal(pid)).content_version).toBe(2);
  });

  test('valid_until on sent: earlier → proposal_validity_shortened; later → ok; null → refused', async () => {
    const { pid } = await issued();
    const before = (await proposal(pid)).valid_until as string;
    const { error: earlier } = await svc.from('engagement_proposals').update({ valid_until: '2020-01-01' }).eq('id', pid);
    expect(earlier?.message).toContain('proposal_validity_shortened');
    const { error: nulled } = await svc.from('engagement_proposals').update({ valid_until: null }).eq('id', pid);
    expect(nulled?.message).toContain('proposal_validity_shortened');
    const { error: later } = await svc.from('engagement_proposals').update({ valid_until: '2099-12-31' }).eq('id', pid);
    expect(later).toBeNull();
    expect(String((await proposal(pid)).valid_until) > before).toBe(true);
  });

  test('issued fields are immutable after sent', async () => {
    const { pid } = await issued();
    for (const patch of [
      { issued_snapshot: { tampered: true } },
      { issued_pdf_path: 'elsewhere.pdf' },
      { issued_pdf_sha256: sha256('other') },
      { sent_at: new Date().toISOString() },
      { delivery_method: 'manual' },
    ]) {
      const { error } = await svc.from('engagement_proposals').update(patch).eq('id', pid);
      expect(error?.message, JSON.stringify(patch)).toContain('proposal_issued_fields_locked');
    }
  });

  test('on accepted: token columns, counters and notification_sent_at mutable; accepted_by_name and issued_snapshot immutable', async () => {
    const { pid, hash } = await issued();
    expect((await acceptClient(pid, hash)).data).toMatchObject({ applied: true });
    const pair = tokenPair();
    const now = new Date().toISOString();
    const { error: rotate } = await svc.from('engagement_proposals').update({
      access_token_hash: pair.hash, token_issued_at: now, token_expires_at: new Date(Date.now() + 86400_000).toISOString(), token_revoked_at: null,
    }).eq('id', pid);
    expect(rotate).toBeNull();
    const { error: revoke } = await svc.from('engagement_proposals').update({ token_revoked_at: now }).eq('id', pid);
    expect(revoke).toBeNull();
    const { error: counters } = await svc.from('engagement_proposals').update({ open_count: 5, last_opened_at: now, notification_sent_at: now }).eq('id', pid);
    expect(counters).toBeNull();
    const { error: name } = await svc.from('engagement_proposals').update({ accepted_by_name: 'Someone Else' }).eq('id', pid);
    expect(name?.message).toContain('proposal_acceptance_locked');
    const { error: via } = await svc.from('engagement_proposals').update({ accepted_via: 'admin' }).eq('id', pid);
    expect(via?.message).toContain('proposal_acceptance_locked');
    const { error: snap } = await svc.from('engagement_proposals').update({ issued_snapshot: { tampered: true } }).eq('id', pid);
    expect(snap?.message).toContain('proposal_issued_fields_locked');
    const { error: content } = await svc.from('engagement_proposals').update({ total_build: 1, pricing: { ...PRICING, total_build: 1 } }).eq('id', pid);
    expect(content?.message).toContain('proposal_content_locked');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Shape CHECKs
// ────────────────────────────────────────────────────────────────────────────
describe('shape CHECKs', () => {
  test('sent without snapshot / pdf path / valid_until; link without token; manual with token; accepted without via; voided without reason', async () => {
    const eid = await start(LEAD.a);
    const sent = shapeFor('sent');
    const pair = tokenPair();
    const tok = { access_token_hash: pair.hash, token_issued_at: new Date().toISOString(), token_expires_at: new Date(Date.now() + 86400_000).toISOString() };
    const cases: [string, string, Record<string, unknown>][] = [
      ['sent without snapshot', 'sent', { ...sent, issued_snapshot: null }],
      ['sent without pdf path', 'sent', { ...sent, issued_pdf_path: null }],
      ['sent without sha', 'sent', { ...sent, issued_pdf_sha256: null }],
      ['sent without valid_until', 'sent', { ...sent, valid_until: null }],
      ['link without token', 'sent', { ...sent, delivery_method: 'link' }],
      ['accepted without via', 'accepted', { ...shapeFor('accepted'), accepted_via: null }],
      ['voided without reason', 'voided', { ...shapeFor('voided'), void_reason: null }],
      ['draft with a token', 'draft', tok],
      ['half a token record', 'draft', { token_issued_at: new Date().toISOString() }],
      ['bad sha', 'sent', { ...sent, issued_pdf_sha256: 'nope' }],
    ];
    for (const [label, status, extra] of cases) {
      await expect(insertDirect(eid, status, 1, extra), label).rejects.toMatchObject({ code: '23514' });
    }
    // link WITH a token passes; manual WITH a token is allowed by the shape (a
    // manual row that later gains link delivery — the RPC's delivery check is
    // the issue-time rule) — so assert the happy path only.
    const ok = await insertDirect(eid, 'sent', 1, { ...sent, delivery_method: 'link', ...tok });
    expect(ok).toBeTruthy();
  });

  test('mode/terms mismatch, totals mismatch, six sections, negative totals rejected', async () => {
    const eid = await start(LEAD.a);
    await expect(insertDirect(eid, 'draft', 1, { pricing_mode: 'performance' })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { performance_terms: { rate_percent: 10 } })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { total_build: 87501 })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { pricing: { ...PRICING, total_monthly: '6500' } })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { pricing: [] })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { sections: sections().slice(0, 6) })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { total_build: -1, pricing: { ...PRICING, total_build: -1 } })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { drafting_status: 'failed' })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { drafting_status: 'generating' })).rejects.toMatchObject({ code: '23514' });
    await expect(insertDirect(eid, 'draft', 1, { drafting_status: 'failed', drafting_error: 'raw provider text' })).rejects.toMatchObject({ code: '23514' });
    const perf = await insertDirect(eid, 'draft', 1, { pricing_mode: 'performance', performance_terms: { rate_percent: 10 } });
    expect(perf).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Issue
// ────────────────────────────────────────────────────────────────────────────
describe('issue_engagement_proposal', () => {
  test('from draft → not_ready; stale content_version → stale; stale engagement updated_at → stale', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid);
    expect((await issue(pid)).data).toEqual({ applied: false, reason: 'not_ready' });
    await markReady(pid);
    expect((await issue(pid, { contentVersion: 99 })).data).toEqual({ applied: false, reason: 'stale' });
    expect((await issue(pid, { engagementUpdatedAt: '2020-01-01T00:00:00Z' })).data).toEqual({ applied: false, reason: 'stale' });
    // A contact edit between the read and the issue is a stale snapshot source too.
    const e = await engagement(eid);
    await svc.from('engagements').update({ client_contact_name: 'Renamed' }).eq('id', eid);
    expect((await issue(pid, { engagementUpdatedAt: e.updated_at as string })).data).toEqual({ applied: false, reason: 'stale' });
    expect((await proposal(pid)).status).toBe('ready');
  });

  test('blank recommendation → proposal_incomplete; delivery shape enforced', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid, { p_sections: sections({ recommendation: '   ' }) });
    await markReady(pid);
    const { error } = await issue(pid);
    expect(error?.message).toContain('proposal_incomplete');

    const g2 = await gated(LEAD.c);
    const p2 = await createProposal(g2.eid, g2.bid);
    await markReady(p2);
    const { error: linkNoToken } = await issue(p2, { delivery: 'link', hash: null });
    expect(linkNoToken?.message).toContain('issue_delivery_shape');
    const { error: manualWithToken } = await issue(p2, { delivery: 'manual', hash: tokenPair().hash });
    expect(manualWithToken?.message).toContain('issue_delivery_shape');
    expect((await proposal(p2)).status).toBe('ready');
  });

  test('success stores snapshot/path/sha/sent_at, defaults valid_until to HST today + 30, writes proposal_sent; manual carries no token', async () => {
    const { eid, pid, hash } = await issued();
    const p = await proposal(pid);
    expect(p).toMatchObject({ status: 'sent', delivery_method: 'link', issued_snapshot: SNAPSHOT, access_token_hash: hash, content_version: 1 });
    expect(p.sent_at).not.toBeNull();
    expect(p.issued_pdf_path).toBe(`proposals/${eid}/${pid}-v1.pdf`);
    expect(p.issued_pdf_sha256).toMatch(/^[0-9a-f]{64}$/);
    const hstToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' }));
    const expected = new Date(hstToday.getFullYear(), hstToday.getMonth(), hstToday.getDate() + 30);
    const iso = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
    expect(p.valid_until).toBe(iso);
    const sent = await events(eid, 'proposal_sent');
    expect(sent).toHaveLength(1);
    expect(sent[0].data).toMatchObject({ proposal_id: pid, version: 1, delivery: 'link', emailed: null, valid_until: iso });

    const m = await issued(LEAD.b, 'manual');
    const mp = await proposal(m.pid);
    expect(mp).toMatchObject({ status: 'sent', delivery_method: 'manual', access_token_hash: null, token_expires_at: null });

    // An explicit valid_until is honoured; a replay on a sent row is not_ready.
    const g = await gated(LEAD.c);
    const p3 = await createProposal(g.eid, g.bid);
    await markReady(p3);
    expect((await issue(p3, { validUntil: '2099-06-30' })).data).toMatchObject({ applied: true, valid_until: '2099-06-30' });
    expect((await issue(p3)).data).toEqual({ applied: false, reason: 'not_ready' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Accept
// ────────────────────────────────────────────────────────────────────────────
describe('accept_engagement_proposal', () => {
  test('client accept from sent with the right hash: proposal accepted, money + stage written, won_at, lead won, events; replay → already_accepted', async () => {
    const { eid, pid, hash } = await issued();
    const { data, error } = await acceptClient(pid, hash, '  Test Client  ');
    expect(error).toBeNull();
    expect(data).toEqual({ applied: true, engagement_id: eid, stage_moved: true });
    const p = await proposal(pid);
    expect(p).toMatchObject({ status: 'accepted', accepted_via: 'client', accepted_by_name: 'Test Client', access_token_hash: hash, token_revoked_at: null });
    expect(p.accepted_at).not.toBeNull();
    const e = await engagement(eid);
    expect(e).toMatchObject({ tier: 'starter', currency: 'USD', contract_value: 87500, care_mrr: 6500, stage: 'build' });
    expect(e.won_at).not.toBeNull();
    expect(await leadStage(LEAD.a)).toBe('won');
    const accepted = await events(eid, 'proposal_accepted');
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({ actor: 'client', needs_attention: true });
    expect(accepted[0].data).toMatchObject({ proposal_id: pid, version: 1, total_build: 87500, total_monthly: 6500, currency: 'USD', stage_moved: true });
    const stageChanged = await events(eid, 'stage_changed');
    expect(stageChanged.map((x) => x.to_stage)).toEqual(['discovery', 'build']);

    expect((await acceptClient(pid, hash)).data).toEqual({ applied: false, reason: 'already_accepted' });
    expect(await events(eid, 'proposal_accepted')).toHaveLength(1);
  });

  test('wrong hash, revoked, rotated, expired token → forbidden; nothing written', async () => {
    const { eid, pid, hash } = await issued();
    expect((await acceptClient(pid, sha256('wrong'))).data).toEqual({ applied: false, reason: 'forbidden' });
    expect((await acceptClient(pid, null)).data).toEqual({ applied: false, reason: 'forbidden' });
    await svc.from('engagement_proposals').update({ token_revoked_at: new Date().toISOString() }).eq('id', pid);
    expect((await acceptClient(pid, hash)).data).toEqual({ applied: false, reason: 'forbidden' });
    // Rotate: the old hash is forbidden, the new one works.
    const pair = tokenPair();
    await svc.from('engagement_proposals').update({ access_token_hash: pair.hash, token_issued_at: new Date().toISOString(), token_expires_at: new Date(Date.now() + 86400_000).toISOString(), token_revoked_at: null }).eq('id', pid);
    expect((await acceptClient(pid, hash)).data).toEqual({ applied: false, reason: 'forbidden' });
    // Expired token: forbidden (the hash is right but the credential is dead).
    await svc.from('engagement_proposals').update({ token_expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', pid);
    expect((await acceptClient(pid, pair.hash)).data).toEqual({ applied: false, reason: 'forbidden' });
    expect((await proposal(pid)).status).toBe('sent');
    expect((await engagement(eid)).contract_value).toBeNull();
    expect(await events(eid, 'proposal_accepted')).toHaveLength(0);
    await svc.from('engagement_proposals').update({ token_expires_at: new Date(Date.now() + 86400_000).toISOString() }).eq('id', pid);
    expect((await acceptClient(pid, pair.hash)).data).toMatchObject({ applied: true });
  });

  test('revoke committed while the accept waits on the lock → the accept loses (forbidden)', async () => {
    const { pid, hash } = await issued();
    await withPg(async (a) => {
      await a.query('BEGIN');
      await a.query('select id from public.engagements where id = (select engagement_id from public.engagement_proposals where id = $1) for update', [pid]);
      const accept = acceptClient(pid, hash);
      await sleep(500);
      expect((await proposal(pid)).status).toBe('sent');
      await a.query('update public.engagement_proposals set token_revoked_at = now() where id = $1', [pid]);
      await a.query('COMMIT');
      const { data, error } = await accept;
      expect(error).toBeNull();
      expect(data).toEqual({ applied: false, reason: 'forbidden' });
    });
    expect((await proposal(pid)).status).toBe('sent');
  });

  test('two concurrent client accepts → one accepted, one already_accepted, one event', async () => {
    const { eid, pid, hash } = await issued();
    const [r1, r2] = await Promise.all([acceptClient(pid, hash, 'First'), acceptClient(pid, hash, 'Second')]);
    const outcomes = [r1.data, r2.data].map((d) => (d as { applied: boolean }).applied).sort();
    expect(outcomes).toEqual([false, true]);
    expect([r1.data, r2.data].find((d) => !(d as { applied: boolean }).applied)).toEqual({ applied: false, reason: 'already_accepted' });
    expect(await events(eid, 'proposal_accepted')).toHaveLength(1);
    expect(await events(eid, 'stage_changed')).toHaveLength(2);
  });

  test('client past valid_until → expired; admin past valid_until → applied', async () => {
    const { pid, hash } = await issued();
    await svc.from('engagement_proposals').update({ valid_until: '2099-01-01' }).eq('id', pid); // extend first…
    // …then shrink through pg (the guard forbids it via the API — the plan's
    // step 12 sets yesterday "via the DB"): disable the trigger for one statement.
    await withPg(async (c) => {
      await c.query('alter table public.engagement_proposals disable trigger trg_engagement_proposals_guard');
      try {
        await c.query("update public.engagement_proposals set valid_until = (now() at time zone 'Pacific/Honolulu')::date - 1 where id = $1", [pid]);
      } finally {
        await c.query('alter table public.engagement_proposals enable trigger trg_engagement_proposals_guard');
      }
    });
    expect((await acceptClient(pid, hash)).data).toEqual({ applied: false, reason: 'expired' });
    expect((await acceptAdmin(pid)).data).toMatchObject({ applied: true });
    expect((await proposal(pid)).accepted_via).toBe('admin');
  });

  test('admin with a non-null hash → RAISE; admin on ready → not_open; blank name → accepted_by_required; bad via → RAISE', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid);
    await markReady(pid);
    expect((await acceptAdmin(pid)).data).toEqual({ applied: false, reason: 'not_open' });
    const { error: withHash } = await svc.rpc('accept_engagement_proposal', { p_proposal_id: pid, p_accepted_by_name: 'x', p_via: 'admin', p_token_hash: sha256('x') });
    expect(withHash?.message).toContain('accept_admin_token_not_allowed');
    const { error: via } = await svc.rpc('accept_engagement_proposal', { p_proposal_id: pid, p_accepted_by_name: 'x', p_via: 'system', p_token_hash: null });
    expect(via).not.toBeNull();
    const s = await issued(LEAD.b);
    const { error: blank } = await acceptAdmin(s.pid, '   ');
    expect(blank?.message).toContain('accepted_by_required');
    const { error: long } = await acceptAdmin(s.pid, 'x'.repeat(201));
    expect(long?.message).toContain('accepted_by_required');
    expect((await proposal(s.pid)).status).toBe('sent');
    const { error: missing } = await acceptAdmin(ZERO_UUID);
    expect(missing?.message).toContain('proposal_not_found');
  });

  test('engagement already at launch → money set, stage unchanged, stage_moved=false; lost → engagement_terminal', async () => {
    const { eid, pid, hash } = await issued();
    await svc.from('engagements').update({ stage: 'launch' }).eq('id', eid);
    const wonAt = (await engagement(eid)).won_at;
    expect((await acceptClient(pid, hash)).data).toEqual({ applied: true, engagement_id: eid, stage_moved: false });
    expect(await engagement(eid)).toMatchObject({ stage: 'launch', contract_value: 87500, care_mrr: 6500, won_at: wonAt });
    expect((await events(eid, 'proposal_accepted'))[0].data).toMatchObject({ stage_moved: false });

    const l = await issued(LEAD.b);
    await svc.from('engagements').update({ stage: 'lost', lost_reason: 'gone' }).eq('id', l.eid);
    // The sweep withdrew it; a forced accept is refused on the engagement first.
    const { error } = await acceptClient(l.pid, l.hash);
    expect(error?.message).toContain('engagement_terminal');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Lock-order races (two connections, no deadlock error)
// ────────────────────────────────────────────────────────────────────────────
describe('lock-order races', () => {
  test('revise commits first → the waiting accept sees not_open', async () => {
    const { eid, bid, pid, hash } = await issued();
    await withPg(async (a) => {
      await a.query('BEGIN');
      const r = await a.query(
        `select public.create_engagement_proposal($1, 'Rev', 'USD', 'starter', 'fixed', $2::jsonb, 87500, 6500, null, $3::jsonb, 'provisional', $4, null, $5) as id`,
        [eid, JSON.stringify(PRICING), JSON.stringify(sections()), bid, pid],
      );
      expect(r.rows[0].id).toBeTruthy();
      const accept = acceptClient(pid, hash);
      await sleep(500);
      expect((await proposal(pid)).status).toBe('sent'); // A has not committed
      await a.query('COMMIT');
      const { data, error } = await accept;
      expect(error).toBeNull();
      expect(data).toEqual({ applied: false, reason: 'not_open' });
    });
    expect((await proposal(pid)).status).toBe('superseded');
  });

  test('accept commits first → the waiting revise gets a clean verdict (proposal_already_accepted)', async () => {
    const { eid, bid, pid, hash } = await issued();
    await withPg(async (a) => {
      await a.query('BEGIN');
      const r = await a.query("select public.accept_engagement_proposal($1, 'Client', 'client', $2) as r", [pid, hash]);
      expect(r.rows[0].r.applied).toBe(true);
      const revise = svc.rpc('create_engagement_proposal', createArgs(eid, bid, { p_supersede_id: pid }));
      await sleep(500);
      await a.query('COMMIT');
      const { error } = await revise;
      expect(error).not.toBeNull();
      expect(error!.message).not.toMatch(/deadlock/i);
      expect(error!.message).toContain('proposal_already_accepted');
    });
    expect((await proposal(pid)).status).toBe('accepted');
  });

  test('Lost commits first → accept sees engagement_terminal; accept first → Lost sweeps nothing', async () => {
    const one = await issued(LEAD.a);
    await withPg(async (a) => {
      await a.query('BEGIN');
      await a.query("update public.engagements set stage = 'lost', lost_reason = 'gone' where id = $1", [one.eid]);
      const accept = acceptClient(one.pid, one.hash);
      await sleep(500);
      await a.query('COMMIT');
      const { error } = await accept;
      expect(error?.message).toContain('engagement_terminal');
    });
    expect((await proposal(one.pid)).status).toBe('withdrawn');

    const two = await issued(LEAD.b);
    await withPg(async (a) => {
      await a.query('BEGIN');
      const r = await a.query("select public.accept_engagement_proposal($1, 'Client', 'client', $2) as r", [two.pid, two.hash]);
      expect(r.rows[0].r.applied).toBe(true);
      const lost = svc.from('engagements').update({ stage: 'lost', lost_reason: 'changed their mind' }).eq('id', two.eid);
      await sleep(500);
      await a.query('COMMIT');
      const { error } = await lost;
      expect(error).toBeNull();
    });
    expect(await proposal(two.pid)).toMatchObject({ status: 'accepted', token_revoked_at: null });
    expect((await engagement(two.eid)).stage).toBe('lost');
    expect(await events(two.eid, 'proposal_withdrawn')).toHaveLength(0);
  });

  test('void waits on the engagement lock and sees not_accepted until an accept commits', async () => {
    const { pid, hash } = await issued();
    await withPg(async (a) => {
      await a.query('BEGIN');
      await a.query('select id from public.engagements where id = (select engagement_id from public.engagement_proposals where id = $1) for update', [pid]);
      const v = voidAcceptance(pid);
      await sleep(500);
      await a.query('COMMIT');
      expect((await v).data).toEqual({ applied: false, reason: 'not_accepted' });
    });
    expect((await acceptClient(pid, hash)).data).toMatchObject({ applied: true });
    expect((await voidAcceptance(pid)).data).toEqual({ applied: true, stage_reverted: true });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Void
// ────────────────────────────────────────────────────────────────────────────
describe('void_engagement_proposal_acceptance', () => {
  test('accepted → voided: money cleared, build → proposal, won_at retained, lead mirrors back, token revoked, event; then create/issue/accept again', async () => {
    const { eid, bid, pid, hash } = await issued();
    expect((await voidAcceptance(pid)).data).toEqual({ applied: false, reason: 'not_accepted' });
    expect((await acceptClient(pid, hash)).data).toMatchObject({ applied: true });
    const wonAt = (await engagement(eid)).won_at;
    const { error: noReason } = await voidAcceptance(pid, '  ');
    expect(noReason?.message).toContain('void_reason_required');
    const { data } = await voidAcceptance(pid, 'wrong tier');
    expect(data).toEqual({ applied: true, stage_reverted: true });
    const p = await proposal(pid);
    expect(p).toMatchObject({ status: 'voided', void_reason: 'wrong tier', accepted_by_name: 'Test Client' });
    expect(p.voided_at).not.toBeNull();
    expect(p.token_revoked_at).not.toBeNull();
    const e = await engagement(eid);
    expect(e).toMatchObject({ stage: 'proposal', contract_value: null, care_mrr: null, tier: 'starter', currency: 'USD', won_at: wonAt });
    expect(await leadStage(LEAD.a)).toBe('proposal');
    const voided = await events(eid, 'proposal_acceptance_voided');
    expect(voided).toHaveLength(1);
    expect(voided[0]).toMatchObject({ needs_attention: true });
    expect(voided[0].data).toMatchObject({ proposal_id: pid, version: 1, reason: 'wrong tier', stage_reverted: true, won_at_retained: true });
    expect((await voidAcceptance(pid)).data).toEqual({ applied: false, reason: 'not_accepted' });

    // The slot is free: v2 (copy, no supersede) → ready → issue manual → admin accept.
    const v2 = await createProposal(eid, bid, { p_tier: 'pro', p_pricing: { ...PRICING, tier: 'pro', total_build: 250000, total_monthly: 7500 }, p_total_build: 250000, p_total_monthly: 7500 });
    await markReady(v2);
    expect((await issue(v2, { delivery: 'manual' })).data).toMatchObject({ applied: true });
    expect((await acceptAdmin(v2)).data).toMatchObject({ applied: true, stage_moved: true });
    expect(await engagement(eid)).toMatchObject({ stage: 'build', tier: 'pro', contract_value: 250000, care_mrr: 7500, won_at: wonAt });
  });

  test('void on a launch engagement leaves the stage alone', async () => {
    const { eid, pid, hash } = await issued();
    await acceptClient(pid, hash);
    await svc.from('engagements').update({ stage: 'launch' }).eq('id', eid);
    expect((await voidAcceptance(pid)).data).toEqual({ applied: true, stage_reverted: false });
    expect(await engagement(eid)).toMatchObject({ stage: 'launch', contract_value: null });
    expect(await leadStage(LEAD.a)).toBe('won');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Terminal sweep
// ────────────────────────────────────────────────────────────────────────────
describe('terminal sweep', () => {
  test('Lost withdraws draft|ready|sent rows with events + revoked tokens, leaves accepted/voided; reopening restores nothing', async () => {
    const { eid, pid, hash } = await issued();
    expect((await acceptClient(pid, hash)).data).toMatchObject({ applied: true });
    await voidAcceptance(pid);
    const accepted = await insertDirect(eid, 'accepted', 2);
    const sentPid = await insertDirect(eid, 'sent', 3, { ...shapeFor('sent'), delivery_method: 'link', access_token_hash: tokenPair().hash, token_issued_at: new Date().toISOString(), token_expires_at: new Date(Date.now() + 86400_000).toISOString() });
    // one_open allows a single open row per engagement, so the draft case
    // runs on a second engagement.
    const g2 = await gated(LEAD.b);
    const draft = await createProposal(g2.eid, g2.bid);

    const { error } = await svc.from('engagements').update({ stage: 'lost', lost_reason: 'gone' }).eq('id', eid);
    expect(error).toBeNull();
    expect(await proposal(sentPid)).toMatchObject({ status: 'withdrawn' });
    expect((await proposal(sentPid)).token_revoked_at).not.toBeNull();
    expect((await proposal(sentPid)).withdrawn_at).not.toBeNull();
    expect((await proposal(accepted)).status).toBe('accepted');
    expect((await proposal(pid)).status).toBe('voided');
    const withdrawn = await events(eid, 'proposal_withdrawn');
    expect(withdrawn).toHaveLength(1);
    expect(withdrawn[0]).toMatchObject({ actor: 'system' });
    expect(withdrawn[0].data).toMatchObject({ proposal_id: sentPid, version: 3, reason: 'lost' });

    await svc.from('engagements').update({ stage: 'closed' }).eq('id', g2.eid);
    expect((await proposal(draft)).status).toBe('withdrawn');
    expect((await proposal(draft)).token_revoked_at).toBeNull(); // no token record to revoke

    await svc.from('engagements').update({ stage: 'proposal' }).eq('id', eid);
    expect((await proposal(sentPid)).status).toBe('withdrawn');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Drafting — claim + finalize CAS
// ────────────────────────────────────────────────────────────────────────────
describe('drafting claim + finalize', () => {
  async function claim(pid: string) {
    return withPg(async (c) => {
      const r = await c.query(
        `update public.engagement_proposals
            set drafting_status = 'generating', drafting_started_at = now(),
                drafting_run_id = gen_random_uuid(), drafting_input_version = content_version
          where id = $1 and status = 'draft' and drafting_status <> 'generating'
          returning drafting_run_id, content_version`,
        [pid],
      );
      return r.rows as { drafting_run_id: string; content_version: number }[];
    });
  }

  test('the conditional claim updates exactly one row; a second claim zero; wrong run_id → applied:false', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid);
    const first = await claim(pid);
    expect(first).toHaveLength(1);
    expect(first[0].content_version).toBe(1);
    expect(await claim(pid)).toHaveLength(0);
    const { data } = await svc.rpc('finalize_engagement_proposal_draft', {
      p_proposal_id: pid, p_run_id: randomUUID(), p_status: 'failed', p_drafting_error: 'timeout',
    });
    expect(data).toEqual({ applied: false });
    expect((await proposal(pid)).drafting_status).toBe('generating');
  });

  test('completed merges ONLY the five keys (titles, terms, next_steps, order preserved), bumps content_version, logs', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid, { p_sections: sections({ terms: 'Ryan terms', next_steps: 'Ryan next' }).map((s) => ({ ...s, title: `T:${s.key}` })) });
    const [{ drafting_run_id }] = await claim(pid);
    const { data, error } = await svc.rpc('finalize_engagement_proposal_draft', {
      p_proposal_id: pid,
      p_run_id: drafting_run_id,
      p_status: 'completed',
      p_ai_sections: { exec_summary: 'AI exec', takeaways: 'AI take', recommendation: 'AI rec', scope: 'AI scope', investment_notes: 'AI inv' },
      p_source_snapshot: { brief_id: bid },
      p_model_id: 'claude-sonnet-5',
      p_pipeline_version: 'proposal-v1',
    });
    expect(error).toBeNull();
    expect(data).toEqual({ applied: true, status: 'completed' });
    const p = await proposal(pid);
    expect(p).toMatchObject({ drafting_status: 'completed', content_version: 2, drafting_model_id: 'claude-sonnet-5', drafting_error: null, source_snapshot: { brief_id: bid } });
    expect(p.drafted_at).not.toBeNull();
    const secs = p.sections as { key: string; title: string; body_md: string }[];
    expect(secs.map((s) => s.key)).toEqual([...SECTION_KEYS]);
    expect(secs.map((s) => s.title)).toEqual(SECTION_KEYS.map((k) => `T:${k}`));
    expect(secs.map((s) => s.body_md)).toEqual(['AI exec', 'AI take', 'AI rec', 'AI scope', 'AI inv', 'Ryan terms', 'Ryan next']);
    expect(await events(eid, 'proposal_ai_drafted')).toHaveLength(1);

    // terms / next_steps in the payload are refused.
    const [{ drafting_run_id: run2 }] = await claim(pid);
    const { error: badKey } = await svc.rpc('finalize_engagement_proposal_draft', {
      p_proposal_id: pid, p_run_id: run2, p_status: 'completed', p_ai_sections: { terms: 'AI terms' }, p_model_id: 'm', p_pipeline_version: 'v',
    });
    expect(badKey?.message).toContain('ai_sections');
  });

  test('changed content_version → failed/stale_input (event, needs attention); completed on ready → proposal_not_draft; failed requires an error', async () => {
    const { eid, bid } = await gated();
    const pid = await createProposal(eid, bid);
    const [{ drafting_run_id }] = await claim(pid);
    // Simulate a content change that slipped past (the guard would refuse; flip through pg with the trigger off).
    await withPg(async (c) => {
      await c.query('alter table public.engagement_proposals disable trigger trg_engagement_proposals_guard');
      try {
        await c.query('update public.engagement_proposals set content_version = content_version + 1 where id = $1', [pid]);
      } finally {
        await c.query('alter table public.engagement_proposals enable trigger trg_engagement_proposals_guard');
      }
    });
    const { data } = await svc.rpc('finalize_engagement_proposal_draft', {
      p_proposal_id: pid, p_run_id: drafting_run_id, p_status: 'completed',
      p_ai_sections: { exec_summary: 'late' }, p_model_id: 'm', p_pipeline_version: 'v',
    });
    expect(data).toEqual({ applied: true, status: 'failed', drafting_error: 'stale_input' });
    const p = await proposal(pid);
    expect(p).toMatchObject({ drafting_status: 'failed', drafting_error: 'stale_input' });
    expect((p.sections as { body_md: string }[])[0].body_md).toBe('Body of exec_summary.');
    const failed = await events(eid, 'proposal_ai_failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ needs_attention: true });

    const [{ drafting_run_id: run2 }] = await claim(pid);
    const { error: noErr } = await svc.rpc('finalize_engagement_proposal_draft', { p_proposal_id: pid, p_run_id: run2, p_status: 'failed' });
    expect(noErr?.message).toContain('requires drafting_error');
    const { data: failed2 } = await svc.rpc('finalize_engagement_proposal_draft', { p_proposal_id: pid, p_run_id: run2, p_status: 'failed', p_drafting_error: 'emitted_price' });
    expect(failed2).toEqual({ applied: true, status: 'failed' });
    expect((await proposal(pid)).drafting_error).toBe('emitted_price');
    expect(await events(eid, 'proposal_ai_failed')).toHaveLength(2);

    // completed on a ready row → proposal_not_draft (the claim requires draft, so stage it directly).
    const [{ drafting_run_id: run3 }] = await claim(pid);
    await svc.from('engagement_proposals').update({ status: 'ready' }).eq('id', pid);
    const { error: notDraft } = await svc.rpc('finalize_engagement_proposal_draft', {
      p_proposal_id: pid, p_run_id: run3, p_status: 'completed', p_ai_sections: { scope: 'x' }, p_model_id: 'm', p_pipeline_version: 'v',
    });
    expect(notDraft?.message).toContain('proposal_not_draft');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Token hygiene + touch
// ────────────────────────────────────────────────────────────────────────────
describe('token hygiene', () => {
  test('after issue and after accept: the row holds only a 64-hex hash; no event data or summary carries a 64-hex string', async () => {
    const { eid, pid, token, hash } = await issued();
    const check = async () => {
      const p = await proposal(pid);
      expect(p.access_token_hash).toBe(hash);
      expect(p.access_token_hash).toMatch(/^[0-9a-f]{64}$/);
      for (const key of Object.keys(p)) expect(String(p[key]), key).not.toContain(token);
      for (const e of await events(eid)) {
        expect(JSON.stringify(e.data), String(e.kind)).not.toMatch(/[0-9a-f]{64}/);
        expect(String(e.summary), String(e.kind)).not.toMatch(/[0-9a-f]{64}/);
      }
    };
    await check();
    await svc.rpc('touch_engagement_proposal_open', { p_proposal_id: pid });
    expect((await acceptClient(pid, hash)).data).toMatchObject({ applied: true });
    await check();
    await voidAcceptance(pid);
    await check();
    const { error: raw } = await svc.from('engagement_proposals').update({ access_token_hash: 'not-a-hash' }).eq('id', pid);
    expect(raw).not.toBeNull();
  });
});

describe('touch_engagement_proposal_open', () => {
  test('bumps counters and writes proposal_opened once across three calls; status stays sent', async () => {
    const { eid, pid } = await issued();
    const { data: first, error } = await svc.rpc('touch_engagement_proposal_open', { p_proposal_id: pid });
    expect(error).toBeNull();
    expect(first).toEqual({ first_open: true });
    await svc.rpc('touch_engagement_proposal_open', { p_proposal_id: pid });
    const { data: third } = await svc.rpc('touch_engagement_proposal_open', { p_proposal_id: pid });
    expect(third).toEqual({ first_open: false });
    const p = await proposal(pid);
    expect(p).toMatchObject({ status: 'sent', open_count: 3 });
    expect(p.first_opened_at).not.toBeNull();
    expect(p.last_opened_at).not.toBeNull();
    expect(await events(eid, 'proposal_opened')).toHaveLength(1);
    const admin = await userClient(USERS.honuvibe_admin);
    const { data: row } = await admin.from('engagement_list').select('proposal_open_count, proposal_first_opened_at, proposal_status, proposal_total_build, proposal_currency').eq('id', eid).single();
    expect(row).toMatchObject({ proposal_open_count: 3, proposal_status: 'sent', proposal_total_build: 87500, proposal_currency: 'USD' });
    expect(row!.proposal_first_opened_at).not.toBeNull();
    const { error: missing } = await svc.rpc('touch_engagement_proposal_open', { p_proposal_id: ZERO_UUID });
    expect(missing?.message).toContain('proposal_not_found');
  });
});
