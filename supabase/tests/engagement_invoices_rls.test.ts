/**
 * Studio deposit + deliverables (migration 075) — RLS, the kind-constraint
 * swap, issue arithmetic/minimums/slots, the mint CAS, the async-payment
 * gate, mark paid (replay vs duplicate payment vs void->paid), refunds
 * (partial then full), the amended void and terminal sweep, the guards, the
 * view's six new columns, event hygiene, and three two-connection races.
 *
 * Same harness as engagement_proposals_rls.test.ts (fixtures, `withPg` for
 * the two-connection cases). Teardown deletes invoices/deliverables →
 * proposals → briefs → questionnaires → engagements → leads.
 */
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { anonClient, serviceClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import {
  DELIVERABLE_PHASES,
  DELIVERABLE_STATUSES,
  ENGAGEMENT_EVENT_KINDS,
  INVOICE_KINDS,
  INVOICE_STATUSES,
} from '../../lib/studio/engagement/types';

const USERS = FIXTURES.users;
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const DB_URL =
  process.env.TEST_SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const svc = serviceClient();

vi.setConfig({ testTimeout: 30_000 });

const FIXTURE_BIZ = 'RLS Fixture Invoice Biz';
const LEAD = {
  a: '55555555-5555-5555-5555-555555570001',
  b: '55555555-5555-5555-5555-555555570002',
  c: '55555555-5555-5555-5555-555555570003',
  d: '55555555-5555-5555-5555-555555570004',
  ja: '55555555-5555-5555-5555-555555570005',
} as const;
const LEAD_IDS = Object.values(LEAD);

const RPCS = [
  'issue_engagement_deposit',
  'begin_engagement_invoice_checkout',
  'record_engagement_invoice_checkout',
  'rearm_engagement_invoice_checkout',
  'mark_engagement_invoice_awaiting_async',
  'mark_engagement_invoice_paid',
  'mark_engagement_invoice_refunded',
  'void_engagement_proposal_acceptance',
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

const CONTACT_EMAIL = 'client-inv@fixture.local';

async function seedLeads(): Promise<void> {
  const rows = [
    { id: LEAD.a, name: 'Kai Fixture', email: 'kai-i@fixture.local', source_locale: 'en', tier_interest: 'starter' },
    { id: LEAD.b, name: 'B Fixture', email: 'b-i@fixture.local', source_locale: 'en', tier_interest: null },
    { id: LEAD.c, name: 'C Fixture', email: 'c-i@fixture.local', source_locale: 'en', tier_interest: null },
    { id: LEAD.d, name: 'D Fixture', email: 'd-i@fixture.local', source_locale: 'en', tier_interest: null },
    { id: LEAD.ja, name: '山田 太郎', email: 'ja-i@fixture.local', source_locale: 'ja', tier_interest: 'pro' },
  ].map((r) => ({ source: 'manual', lifecycle: 'new', business_name: FIXTURE_BIZ, sales_stage: 'qualified', ...r }));
  const { error } = await svc.from('leads').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

async function resetAll(): Promise<void> {
  const { data: es } = await svc.from('engagements').select('id').in('lead_id', LEAD_IDS);
  const eids = (es ?? []).map((e) => e.id as string);
  if (eids.length) {
    // Explicit order (the FKs would cascade, but the plan states the order):
    // invoices/deliverables → proposals → briefs → questionnaires → engagements.
    for (const table of [
      'engagement_invoices',
      'engagement_deliverables',
      'engagement_proposals',
      'engagement_briefs',
      'engagement_questionnaires',
    ]) {
      const r = await svc.from(table).delete().in('engagement_id', eids);
      if (r.error) throw r.error;
    }
    const r = await svc.from('engagements').delete().in('id', eids);
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

async function seedSubmitted(eid: string): Promise<string> {
  const submittedAt = new Date(Date.now() - 3600_000);
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

async function seedBrief(eid: string, qid: string): Promise<string> {
  const { data, error } = await svc
    .from('engagement_briefs')
    .insert({
      engagement_id: eid,
      questionnaire_id: qid,
      status: 'partial',
      digest_md: '# digest',
      generation_error: 'provider_error',
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data!.id as string;
}

const SECTION_KEYS = ['exec_summary', 'takeaways', 'recommendation', 'scope', 'investment_notes', 'terms', 'next_steps'] as const;
function sections(bodies: Partial<Record<(typeof SECTION_KEYS)[number], string>> = {}) {
  return SECTION_KEYS.map((key) => ({ key, title: key.replace('_', ' '), body_md: bodies[key] ?? `Body of ${key}.` }));
}

function pricingFor(currency: 'USD' | 'JPY', totalBuild: number, totalMonthly: number) {
  return {
    currency,
    tier: 'starter',
    inputs: { tier: 'starter', addons: {}, timeline: 'normal' },
    base: { label: 'Starter build', build: totalBuild, monthly: totalMonthly },
    rush: null,
    lines: [],
    adjustment: null,
    usd_reference: null,
    total_build: totalBuild,
    total_monthly: totalMonthly,
  };
}

const SNAPSHOT = { snapshot_version: 1, renderer_version: 'proposal-doc-v1', title: 'Website + booking' };

type AcceptedOpts = {
  currency?: 'USD' | 'JPY';
  totalBuild?: number;
  totalMonthly?: number;
  contactEmail?: string | null;
  title?: string;
  locale?: 'en' | 'ja';
};

/**
 * start_engagement → submitted questionnaire → brief → create → ready →
 * issue → accept, all through the EXISTING RPCs, to reach the accepted state
 * in one call. Returns the ids plus the live token/hash.
 */
async function acceptedProposal(leadId: string, opts: AcceptedOpts = {}) {
  const currency = opts.currency ?? 'USD';
  const totalBuild = opts.totalBuild ?? 87500;
  const totalMonthly = opts.totalMonthly ?? 6500;
  const eid = await start(leadId);
  const qid = await seedSubmitted(eid);
  const bid = await seedBrief(eid, qid);

  const patch: Record<string, unknown> = {
    client_contact_email: opts.contactEmail === undefined ? CONTACT_EMAIL : opts.contactEmail,
    client_contact_name: 'Client Contact',
  };
  if (opts.title) patch.title = opts.title;
  if (opts.locale) patch.locale = opts.locale;
  const { error: patchErr } = await svc.from('engagements').update(patch).eq('id', eid);
  if (patchErr) throw patchErr;

  const { data: pid, error: createErr } = await svc.rpc('create_engagement_proposal', {
    p_engagement_id: eid,
    p_title: 'Website + booking',
    p_currency: currency,
    p_tier: 'starter',
    p_pricing_mode: 'fixed',
    p_pricing: pricingFor(currency, totalBuild, totalMonthly),
    p_total_build: totalBuild,
    p_total_monthly: totalMonthly,
    p_performance_terms: null,
    p_sections: sections({ scope: '- Homepage redesign\n- **Booking** flow\n\nA paragraph.\n- Analytics setup' }),
    p_data_basis: 'provisional',
    p_brief_id: bid,
  });
  if (createErr) throw createErr;
  const proposalId = pid as string;

  const { error: readyErr } = await svc.from('engagement_proposals').update({ status: 'ready' }).eq('id', proposalId);
  if (readyErr) throw readyErr;

  const { data: p } = await svc.from('engagement_proposals').select('content_version').eq('id', proposalId).single();
  const { data: e } = await svc.from('engagements').select('updated_at').eq('id', eid).single();
  const pair = tokenPair();
  const { data: issued, error: issueErr } = await svc.rpc('issue_engagement_proposal', {
    p_proposal_id: proposalId,
    p_content_version: (p as { content_version: number }).content_version,
    p_engagement_updated_at: (e as { updated_at: string }).updated_at,
    p_issued_snapshot: SNAPSHOT,
    p_pdf_path: `proposals/${eid}/${proposalId}-v1.pdf`,
    p_pdf_sha256: sha256(`pdf-${proposalId}`),
    p_delivery: 'link',
    p_token_hash: pair.hash,
    p_token_expires_at: new Date(Date.now() + 45 * 86400_000).toISOString(),
    p_valid_until: null,
  });
  if (issueErr) throw issueErr;
  expect(issued).toMatchObject({ applied: true });

  const { data: accepted, error: acceptErr } = await svc.rpc('accept_engagement_proposal', {
    p_proposal_id: proposalId,
    p_accepted_by_name: 'Test Client',
    p_via: 'client',
    p_token_hash: pair.hash,
  });
  if (acceptErr) throw acceptErr;
  expect(accepted).toMatchObject({ applied: true });

  return { eid, qid, bid, pid: proposalId, token: pair.token, hash: pair.hash, currency, totalBuild };
}

// ── Row readers ────────────────────────────────────────────────────────────

async function invoice(id: string) {
  const { data, error } = await svc.from('engagement_invoices').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Record<string, unknown>;
}
async function invoicesOf(eid: string) {
  const { data, error } = await svc
    .from('engagement_invoices')
    .select('*')
    .eq('engagement_id', eid)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Record<string, unknown>[];
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
async function events(eid: string, kind?: string) {
  let q = svc.from('engagement_events').select('*').eq('engagement_id', eid).order('created_at', { ascending: true });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) throw error;
  return data as Record<string, unknown>[];
}

// ── RPC wrappers ───────────────────────────────────────────────────────────

async function issueDeposit(pid: string, pct: number) {
  const { data, error } = await svc.rpc('issue_engagement_deposit', { p_proposal_id: pid, p_pct: pct });
  return { data: data as Record<string, unknown> | null, error };
}
async function beginCheckout(invoiceId: string, hash: string | null) {
  const { data, error } = await svc.rpc('begin_engagement_invoice_checkout', {
    p_invoice_id: invoiceId,
    p_token_hash: hash,
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function recordCheckout(invoiceId: string, attempt: number, sessionId: string, expiresAt: Date) {
  const { data, error } = await svc.rpc('record_engagement_invoice_checkout', {
    p_invoice_id: invoiceId,
    p_attempt: attempt,
    p_session_id: sessionId,
    p_expires_at: expiresAt.toISOString(),
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function rearm(invoiceId: string, sessionId: string | null) {
  const { data, error } = await svc.rpc('rearm_engagement_invoice_checkout', {
    p_invoice_id: invoiceId,
    p_session_id: sessionId,
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function awaitingAsync(invoiceId: string, sessionId: string, clear: boolean) {
  const { data, error } = await svc.rpc('mark_engagement_invoice_awaiting_async', {
    p_invoice_id: invoiceId,
    p_session_id: sessionId,
    p_clear: clear,
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function markPaid(
  invoiceId: string,
  sessionId: string,
  pi: string,
  amount: number,
  currency: string,
) {
  const { data, error } = await svc.rpc('mark_engagement_invoice_paid', {
    p_invoice_id: invoiceId,
    p_session_id: sessionId,
    p_payment_intent_id: pi,
    p_amount_total: amount,
    p_currency: currency,
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function markRefunded(pi: string, amountRefunded: number) {
  const { data, error } = await svc.rpc('mark_engagement_invoice_refunded', {
    p_payment_intent_id: pi,
    p_amount_refunded: amountRefunded,
  });
  return { data: data as Record<string, unknown> | null, error };
}
async function voidAcceptance(pid: string, reason = 'wrong tier') {
  const { data, error } = await svc.rpc('void_engagement_proposal_acceptance', { p_proposal_id: pid, p_reason: reason });
  return { data: data as Record<string, unknown> | null, error };
}

/** The deposit + balance rows of an accepted proposal, newest-issued first. */
async function depositAndBalance(eid: string) {
  const rows = await invoicesOf(eid);
  return {
    deposit: rows.find((r) => r.kind === 'deposit' && r.voided_at === null) ?? null,
    balance: rows.find((r) => r.kind === 'balance' && r.voided_at === null) ?? null,
    all: rows,
  };
}

const HOUR = 3600_000;
const future = (ms: number) => new Date(Date.now() + ms);

beforeAll(async () => {
  await seedFixtures();
  await seedLeads();
});

beforeEach(async () => {
  await resetAll();
});

afterAll(async () => {
  await resetAll();
  await svc.from('leads').delete().in('id', LEAD_IDS);
});

// ────────────────────────────────────────────────────────────────────────────
// RLS + grants
// ────────────────────────────────────────────────────────────────────────────
describe('RLS — admin-only tables, service-role RPCs', () => {
  test('anon and a non-admin member are denied both tables; admin has CRUD; service writes freely', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    const { data: issued } = await issueDeposit(pid, 50);
    const invoiceId = issued!.invoice_id as string;
    const { data: del, error: delErr } = await svc
      .from('engagement_deliverables')
      .insert({ engagement_id: eid, title: 'Homepage redesign' })
      .select('id')
      .single();
    expect(delErr).toBeNull();
    const deliverableId = del!.id as string;

    const member = await userClient(USERS.honuvibe_free);
    for (const [label, client] of [['anon', anonClient()], ['member', member]] as const) {
      for (const table of ['engagement_invoices', 'engagement_deliverables'] as const) {
        const { data: sel } = await client.from(table).select('id');
        expect(sel ?? [], `${label} select ${table}`).toEqual([]);
      }
      const { error: insInv } = await client.from('engagement_invoices').insert({
        engagement_id: eid, proposal_id: pid, kind: 'deposit', pct_of_build: 50,
        label: 'hack', currency: 'USD', amount: 100,
      });
      expect(insInv, `${label} insert invoice`).not.toBeNull();
      const { error: insDel } = await client
        .from('engagement_deliverables')
        .insert({ engagement_id: eid, title: 'hack' });
      expect(insDel, `${label} insert deliverable`).not.toBeNull();
      const { data: updInv } = await client
        .from('engagement_invoices').update({ amount: 1 }).eq('id', invoiceId).select('id');
      expect(updInv ?? [], `${label} update invoice`).toEqual([]);
      const { data: delRows } = await client
        .from('engagement_deliverables').delete().eq('id', deliverableId).select('id');
      expect(delRows ?? [], `${label} delete deliverable`).toEqual([]);
      const { data: view } = await client.from('engagement_list').select('id');
      expect(view ?? [], `${label} view`).toEqual([]);
    }
    expect((await invoice(invoiceId)).amount).toBe(43750);

    const admin = await userClient(USERS.honuvibe_admin);
    const { data: adminInv } = await admin.from('engagement_invoices').select('id').eq('id', invoiceId);
    expect(adminInv).toHaveLength(1);
    const { data: adminDel, error: adminDelErr } = await admin
      .from('engagement_deliverables').update({ title: 'Admin edit' }).eq('id', deliverableId).select('id');
    expect(adminDelErr).toBeNull();
    expect(adminDel).toHaveLength(1);
    const { data: adminList } = await admin
      .from('engagement_list')
      .select('deposit_invoice_id, deposit_status, deposit_amount, deliverables_total_count')
      .eq('id', eid)
      .single();
    expect(adminList).toMatchObject({
      deposit_invoice_id: invoiceId,
      deposit_status: 'sent',
      deposit_amount: 43750,
      deliverables_total_count: 1,
    });
  });

  test('every RPC + the formatter: EXECUTE denied for anon, authenticated AND admin; allowed for service role', async () => {
    const member = await userClient(USERS.honuvibe_free);
    const admin = await userClient(USERS.honuvibe_admin);
    const args: Record<(typeof RPCS)[number], Record<string, unknown>> = {
      issue_engagement_deposit: { p_proposal_id: ZERO_UUID, p_pct: 50 },
      begin_engagement_invoice_checkout: { p_invoice_id: ZERO_UUID, p_token_hash: sha256('x') },
      record_engagement_invoice_checkout: { p_invoice_id: ZERO_UUID, p_attempt: 0, p_session_id: 'cs_x', p_expires_at: new Date().toISOString() },
      rearm_engagement_invoice_checkout: { p_invoice_id: ZERO_UUID, p_session_id: null },
      mark_engagement_invoice_awaiting_async: { p_invoice_id: ZERO_UUID, p_session_id: 'cs_x', p_clear: false },
      mark_engagement_invoice_paid: { p_invoice_id: ZERO_UUID, p_session_id: 'cs_x', p_payment_intent_id: 'pi_x', p_amount_total: 1, p_currency: 'usd' },
      mark_engagement_invoice_refunded: { p_payment_intent_id: 'pi_x', p_amount_refunded: 1 },
      void_engagement_proposal_acceptance: { p_proposal_id: ZERO_UUID, p_reason: 'x' },
    };
    for (const rpc of RPCS) {
      for (const [label, client] of [['anon', anonClient()], ['member', member], ['admin', admin]] as const) {
        const { error } = await client.rpc(rpc, args[rpc]);
        expect(error, `${label} ${rpc}`).not.toBeNull();
        expect(error!.message, `${label} ${rpc}`).not.toContain('not_found'); // denied before it ran
      }
    }

    await withPg(async (c) => {
      const sigs: Record<string, string> = {
        issue_engagement_deposit: 'public.issue_engagement_deposit(uuid,int)',
        begin_engagement_invoice_checkout: 'public.begin_engagement_invoice_checkout(uuid,text)',
        record_engagement_invoice_checkout: 'public.record_engagement_invoice_checkout(uuid,int,text,timestamptz)',
        rearm_engagement_invoice_checkout: 'public.rearm_engagement_invoice_checkout(uuid,text)',
        mark_engagement_invoice_awaiting_async: 'public.mark_engagement_invoice_awaiting_async(uuid,text,boolean)',
        mark_engagement_invoice_paid: 'public.mark_engagement_invoice_paid(uuid,text,text,int,text)',
        mark_engagement_invoice_refunded: 'public.mark_engagement_invoice_refunded(text,int)',
        void_engagement_proposal_acceptance: 'public.void_engagement_proposal_acceptance(uuid,text)',
        engagement_format_minor: 'public.engagement_format_minor(int,text)',
      };
      for (const [name, sig] of Object.entries(sigs)) {
        for (const role of ['anon', 'authenticated']) {
          const r = await c.query('select has_function_privilege($1, $2, $3) as ok', [role, sig, 'EXECUTE']);
          expect(r.rows[0].ok, `${role} ${name}`).toBe(false);
        }
        const s = await c.query('select has_function_privilege($1, $2, $3) as ok', ['service_role', sig, 'EXECUTE']);
        expect(s.rows[0].ok, `service_role ${name}`).toBe(true);
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// The constraint swap + the TS/SQL vocabulary parity
// ────────────────────────────────────────────────────────────────────────────
describe('engagement_events.kind constraint swap (075)', () => {
  test('exactly one CHECK covers kind; all 36 TS kinds insert; a bogus kind is rejected', async () => {
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
    expect(ENGAGEMENT_EVENT_KINDS).toHaveLength(36);
    for (const kind of ENGAGEMENT_EVENT_KINDS) {
      const { error } = await svc.from('engagement_events').insert({
        engagement_id: eid, kind, actor: 'system', summary: `kind ${kind}`,
        to_stage: kind === 'stage_changed' ? 'discovery' : null,
      });
      expect(error, kind).toBeNull();
    }
    const { error: bogus } = await svc
      .from('engagement_events')
      .insert({ engagement_id: eid, kind: 'invoice_bogus', summary: 'x' });
    expect(bogus?.code).toBe('23514');
  });

  test('the TS invoice/deliverable vocabularies match the SQL CHECKs', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    for (const kind of INVOICE_KINDS) {
      const { error } = await svc.from('engagement_invoices').insert({
        engagement_id: eid,
        proposal_id: kind === 'care_month' ? null : pid,
        kind,
        pct_of_build: kind === 'care_month' ? null : 50,
        label: `probe ${kind}`,
        currency: 'USD',
        amount: 1000,
        status: 'draft',
      });
      expect(error, kind).toBeNull();
      await svc.from('engagement_invoices').delete().eq('label', `probe ${kind}`);
    }
    const { error: bogusKind } = await svc.from('engagement_invoices').insert({
      engagement_id: eid, proposal_id: pid, kind: 'retainer', pct_of_build: 50,
      label: 'x', currency: 'USD', amount: 1000,
    });
    expect(bogusKind?.code).toBe('23514');

    for (const status of INVOICE_STATUSES) {
      const shape: Record<string, unknown> = { status };
      if (status === 'sent') Object.assign(shape, { sent_at: new Date().toISOString() });
      if (status === 'paid' || status === 'refunded') {
        Object.assign(shape, {
          sent_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: `pi_probe_${status}`,
        });
      }
      if (status === 'refunded') Object.assign(shape, { refunded_at: new Date().toISOString(), amount_refunded: 500 });
      if (status === 'void') Object.assign(shape, { voided_at: new Date().toISOString(), void_reason: 'probe' });
      const { error } = await svc.from('engagement_invoices').insert({
        engagement_id: eid, proposal_id: null, kind: 'care_month', pct_of_build: null,
        label: `status probe ${status}`, currency: 'USD', amount: 1000, ...shape,
      });
      expect(error, status).toBeNull();
      await svc.from('engagement_invoices').delete().eq('label', `status probe ${status}`);
    }

    for (const phase of DELIVERABLE_PHASES) {
      for (const status of DELIVERABLE_STATUSES) {
        const { error } = await svc
          .from('engagement_deliverables')
          .insert({ engagement_id: eid, title: `${phase}/${status}`, phase, status });
        expect(error, `${phase}/${status}`).toBeNull();
      }
    }
    const { error: bogusPhase } = await svc
      .from('engagement_deliverables')
      .insert({ engagement_id: eid, title: 'x', phase: 'care' });
    expect(bogusPhase?.code).toBe('23514');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// issue_engagement_deposit
// ────────────────────────────────────────────────────────────────────────────
describe('issue_engagement_deposit', () => {
  test('50% on 87500 → deposit sent 43750 + balance draft 43750, one invoice_issued with no `emailed` key', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    const { data, error } = await issueDeposit(pid, 50);
    expect(error).toBeNull();
    expect(data).toMatchObject({ amount: 43750, currency: 'USD' });

    const { deposit, balance, all } = await depositAndBalance(eid);
    expect(all).toHaveLength(2);
    expect(deposit).toMatchObject({
      kind: 'deposit', status: 'sent', amount: 43750, pct_of_build: 50, currency: 'USD',
      recipient_email: CONTACT_EMAIL, mint_attempt: 0, checkout_count: 0,
      awaiting_async_payment_at: null, invoice_email_sent_at: null,
    });
    expect(deposit!.sent_at).not.toBeNull();
    expect(deposit!.label).toBe(`Deposit — ${FIXTURE_BIZ} (50%)`);
    expect(balance).toMatchObject({
      kind: 'balance', status: 'draft', amount: 43750, pct_of_build: 50,
      recipient_email: CONTACT_EMAIL, sent_at: null,
    });
    expect(data!.balance_invoice_id).toBe(balance!.id);

    const issuedEvents = await events(eid, 'invoice_issued');
    expect(issuedEvents).toHaveLength(1);
    expect(issuedEvents[0].summary).toBe('Deposit requested: $437.50 (50% of $875.00) — v1');
    expect(issuedEvents[0].needs_attention).toBe(false);
    const eventData = issuedEvents[0].data as Record<string, unknown>;
    expect(Object.keys(eventData).sort()).toEqual(
      ['amount', 'balance_invoice_id', 'currency', 'invoice_id', 'kind', 'pct'].sort(),
    );
    expect(eventData).not.toHaveProperty('emailed');
  });

  test('100% → one row for the full amount and NO balance row, labelled "Build investment"', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    const { data, error } = await issueDeposit(pid, 100);
    expect(error).toBeNull();
    expect(data).toMatchObject({ amount: 87500, balance_invoice_id: null });
    const all = await invoicesOf(eid);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ kind: 'deposit', pct_of_build: 100, amount: 87500, status: 'sent' });
    expect(all[0].label).toBe(`Build investment — ${FIXTURE_BIZ} (100%)`);
    expect((await events(eid, 'invoice_issued'))[0].summary).toBe(
      'Build investment requested: $875.00 (100% of $875.00) — v1',
    );
  });

  test('rounding: JPY 132000 → 66000/66000; 87501 → 43751/43750 and the two sum exactly', async () => {
    const ja = await acceptedProposal(LEAD.ja, { currency: 'JPY', totalBuild: 132000, totalMonthly: 30000 });
    expect((await issueDeposit(ja.pid, 50)).data).toMatchObject({ amount: 66000, currency: 'JPY' });
    const jaRows = await depositAndBalance(ja.eid);
    expect(jaRows.deposit!.amount).toBe(66000);
    expect(jaRows.balance!.amount).toBe(66000);
    expect((await events(ja.eid, 'invoice_issued'))[0].summary).toBe(
      'Deposit requested: ¥66,000 (50% of ¥132,000) — v1',
    );

    const odd = await acceptedProposal(LEAD.b, { totalBuild: 87501 });
    expect((await issueDeposit(odd.pid, 50)).data).toMatchObject({ amount: 43751 });
    const oddRows = await depositAndBalance(odd.eid);
    expect(oddRows.deposit!.amount).toBe(43751);
    expect(oddRows.balance!.amount).toBe(43750);
    expect((oddRows.deposit!.amount as number) + (oddRows.balance!.amount as number)).toBe(87501);
  });

  test('bigint arithmetic: total_build 2,147,483,600 at 50% → 1,073,741,800, no overflow', async () => {
    const big = await acceptedProposal(LEAD.c, { currency: 'JPY', totalBuild: 2_147_483_600, totalMonthly: 0 });
    const { data, error } = await issueDeposit(big.pid, 50);
    expect(error).toBeNull();
    expect(data).toMatchObject({ amount: 1_073_741_800 });
    const rows = await depositAndBalance(big.eid);
    expect(rows.balance!.amount).toBe(1_073_741_800);
  });

  test('refusals: nothing to bill, bad pct, already issued, below minimum, no recipient, not accepted, terminal', async () => {
    const zero = await acceptedProposal(LEAD.a, { totalBuild: 0, totalMonthly: 0 });
    expect((await issueDeposit(zero.pid, 50)).error?.message).toContain('invoice_nothing_to_bill');
    expect((await issueDeposit(zero.pid, 30)).error?.message).toContain('invoice_pct_invalid');

    const ok = await acceptedProposal(LEAD.b);
    expect((await issueDeposit(ok.pid, 50)).error).toBeNull();
    expect((await issueDeposit(ok.pid, 50)).error?.message).toContain('invoice_already_issued');

    // deposit 40 on total 80 → both halves are under the 50-minor-unit floor.
    const tiny = await acceptedProposal(LEAD.c, { totalBuild: 80 });
    expect((await issueDeposit(tiny.pid, 50)).error?.message).toContain('invoice_below_minimum');

    const noEmail = await acceptedProposal(LEAD.d, { contactEmail: null });
    expect((await issueDeposit(noEmail.pid, 50)).error?.message).toContain('invoice_recipient_required');

    expect((await issueDeposit(ZERO_UUID, 50)).error?.message).toContain('proposal_not_found');
  });

  test('a proposal that is only `sent` → proposal_not_accepted; a lost engagement → engagement_terminal', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    await voidAcceptance(pid, 'not this one');
    expect((await issueDeposit(pid, 50)).error?.message).toContain('proposal_not_accepted');

    const other = await acceptedProposal(LEAD.b);
    await svc.from('engagements').update({ stage: 'lost', lost_reason: 'gone' }).eq('id', other.eid);
    expect((await issueDeposit(other.pid, 50)).error?.message).toContain('engagement_terminal');
    expect(eid).toBeTruthy();
  });

  test('a 200-char engagement title still yields a label inside the 200-char CHECK', async () => {
    const long = 'X'.repeat(200);
    const { eid, pid } = await acceptedProposal(LEAD.a, { title: long });
    const { error } = await issueDeposit(pid, 50);
    expect(error).toBeNull();
    const { deposit } = await depositAndBalance(eid);
    expect((deposit!.label as string).length).toBeLessThanOrEqual(200);
    expect(deposit!.label).toBe(`Deposit — ${'X'.repeat(150)} (50%)`);
  });

  test('the table CHECK rejects a direct insert of amount 49; the formatter matches formatMinorUnits', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    const { error } = await svc.from('engagement_invoices').insert({
      engagement_id: eid, proposal_id: pid, kind: 'deposit', pct_of_build: 50,
      label: 'too small', currency: 'USD', amount: 49,
    });
    expect(error?.code).toBe('23514');

    await withPg(async (c) => {
      const r = await c.query(
        `select public.engagement_format_minor(43750,'USD') as a,
                public.engagement_format_minor(66000,'JPY') as b,
                public.engagement_format_minor(87500,'USD') as c`,
      );
      expect(r.rows[0]).toEqual({ a: '$437.50', b: '¥66,000', c: '$875.00' });
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Re-issue after a void, then the OLD session pays (review finding 1)
// ────────────────────────────────────────────────────────────────────────────
describe('re-issue after a void', () => {
  test('lost sweeps D1 void → reopen → re-issue D2 → the old session pays D1 (void→paid), no 23505', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    await issueDeposit(pid, 50);
    const first = await depositAndBalance(eid);
    const d1 = first.deposit!.id as string;

    // Terminal sweep voids the sent deposit AND the draft balance.
    await svc.from('engagements').update({ stage: 'lost', lost_reason: 'paused' }).eq('id', eid);
    expect(await invoice(d1)).toMatchObject({ status: 'void', void_reason: 'Engagement marked lost' });

    // Reopen at build — the acceptance survived (the sweep only withdraws OPEN proposals).
    await svc.from('engagements').update({ stage: 'build' }).eq('id', eid);
    expect((await proposal(pid)).status).toBe('accepted');

    const { data: reissued, error: reissueErr } = await issueDeposit(pid, 50);
    expect(reissueErr).toBeNull();
    const d2 = reissued!.invoice_id as string;
    expect(d2).not.toBe(d1);
    expect(await invoice(d2)).toMatchObject({ status: 'sent', amount: 43750 });

    // The 24 h session Stripe minted for D1 is paid AFTER the void.
    const { data: paid, error: paidErr } = await markPaid(d1, 'cs_old', 'pi_a', 43750, 'usd');
    expect(paidErr).toBeNull();
    expect(paid).toMatchObject({ applied: true, on_void: true });
    const d1Row = await invoice(d1);
    expect(d1Row).toMatchObject({ status: 'paid' });
    expect(d1Row.voided_at).not.toBeNull();
    expect(d1Row.paid_at).not.toBeNull();
    expect(await invoice(d2)).toMatchObject({ status: 'sent' });

    const paidEvents = await events(eid, 'invoice_paid');
    expect(paidEvents).toHaveLength(1);
    expect(paidEvents[0].summary).toContain('VOIDED');
    expect((paidEvents[0].data as Record<string, unknown>).on_void).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// begin / record / rearm / awaiting
// ────────────────────────────────────────────────────────────────────────────
describe('begin_engagement_invoice_checkout', () => {
  async function ready(lead: string = LEAD.a) {
    const a = await acceptedProposal(lead);
    const { data } = await issueDeposit(a.pid, 50);
    return { ...a, invoiceId: data!.invoice_id as string };
  }

  test('correct hash → applied, attempt 0, payload of immutable columns only', async () => {
    const { invoiceId, hash, eid, pid } = await ready();
    const { data, error } = await beginCheckout(invoiceId, hash);
    expect(error).toBeNull();
    expect(data).toEqual({
      applied: true,
      attempt: 0,
      invoice_id: invoiceId,
      amount: 43750,
      currency: 'USD',
      label: `Deposit — ${FIXTURE_BIZ} (50%)`,
      recipient_email: CONTACT_EMAIL,
      engagement_id: eid,
      proposal_id: pid,
      locale: 'en',
    });
  });

  test('wrong hash / revoked / expired token → forbidden', async () => {
    const { invoiceId, hash, pid } = await ready();
    expect((await beginCheckout(invoiceId, sha256('nope'))).data).toEqual({ applied: false, reason: 'forbidden' });
    expect((await beginCheckout(invoiceId, null)).data).toEqual({ applied: false, reason: 'forbidden' });

    await svc.from('engagement_proposals').update({ token_revoked_at: new Date().toISOString() }).eq('id', pid);
    expect((await beginCheckout(invoiceId, hash)).data).toEqual({ applied: false, reason: 'forbidden' });

    await svc
      .from('engagement_proposals')
      .update({ token_revoked_at: null, token_expires_at: new Date(Date.now() - HOUR).toISOString() })
      .eq('id', pid);
    expect((await beginCheckout(invoiceId, hash)).data).toEqual({ applied: false, reason: 'forbidden' });
  });

  test('paid → already_paid; void → not_open; awaiting async → payment_pending and NO re-arm', async () => {
    const paidCase = await ready(LEAD.a);
    await markPaid(paidCase.invoiceId, 'cs_1', 'pi_1', 43750, 'usd');
    expect((await beginCheckout(paidCase.invoiceId, paidCase.hash)).data).toEqual({
      applied: false, reason: 'already_paid',
    });

    const voidCase = await ready(LEAD.b);
    await svc.from('engagements').update({ stage: 'lost', lost_reason: 'x' }).eq('id', voidCase.eid);
    await svc.from('engagements').update({ stage: 'build' }).eq('id', voidCase.eid);
    expect((await beginCheckout(voidCase.invoiceId, voidCase.hash)).data).toEqual({
      applied: false, reason: 'not_open',
    });

    const pendingCase = await ready(LEAD.c);
    await recordCheckout(pendingCase.invoiceId, 0, 'cs_pending', future(24 * HOUR));
    expect((await awaitingAsync(pendingCase.invoiceId, 'cs_pending', false)).data).toMatchObject({ applied: true });
    expect((await beginCheckout(pendingCase.invoiceId, pendingCase.hash)).data).toEqual({
      applied: false, reason: 'payment_pending',
    });
    expect(await invoice(pendingCase.invoiceId)).toMatchObject({
      mint_attempt: 0, stripe_checkout_session_id: 'cs_pending',
    });
  });

  test('a session expiring in 30 s bumps the attempt and clears the session; 2 h out does not', async () => {
    const soon = await ready(LEAD.a);
    await recordCheckout(soon.invoiceId, 0, 'cs_soon', future(30_000));
    const { data: bumped } = await beginCheckout(soon.invoiceId, soon.hash);
    expect(bumped).toMatchObject({ applied: true, attempt: 1 });
    expect(await invoice(soon.invoiceId)).toMatchObject({
      mint_attempt: 1, stripe_checkout_session_id: null, checkout_session_expires_at: null,
    });

    const later = await ready(LEAD.b);
    await recordCheckout(later.invoiceId, 0, 'cs_later', future(2 * HOUR));
    const { data: same } = await beginCheckout(later.invoiceId, later.hash);
    expect(same).toMatchObject({ applied: true, attempt: 0 });
    expect(await invoice(later.invoiceId)).toMatchObject({ stripe_checkout_session_id: 'cs_later' });
  });

  test('record CAS, checkout_count, the session unique index; rearm and awaiting rules', async () => {
    const a = await ready(LEAD.a);
    expect((await recordCheckout(a.invoiceId, 0, 'cs_a', future(24 * HOUR))).data).toEqual({ applied: true });
    expect(await invoice(a.invoiceId)).toMatchObject({ checkout_count: 1, stripe_checkout_session_id: 'cs_a' });
    // A losing attempt number never lands.
    expect((await recordCheckout(a.invoiceId, 1, 'cs_a2', future(24 * HOUR))).data).toMatchObject({ applied: false });

    // uq_engagement_invoices_session: the same session id on a second invoice.
    const b = await ready(LEAD.b);
    const { error: dupSession } = await svc
      .from('engagement_invoices')
      .update({ stripe_checkout_session_id: 'cs_a', checkout_session_expires_at: future(HOUR).toISOString() })
      .eq('id', b.invoiceId);
    expect(dupSession?.code).toBe('23505');

    // rearm: matching session clears; a different one does not; NULL always does.
    expect((await rearm(a.invoiceId, 'cs_other')).data).toMatchObject({ applied: false });
    expect((await rearm(a.invoiceId, 'cs_a')).data).toMatchObject({ applied: true, attempt: 1 });
    expect(await invoice(a.invoiceId)).toMatchObject({ mint_attempt: 1, stripe_checkout_session_id: null });
    expect((await rearm(a.invoiceId, null)).data).toMatchObject({ applied: true, attempt: 2 });

    // rearm refuses while an async payment is outstanding.
    await recordCheckout(a.invoiceId, 2, 'cs_async', future(24 * HOUR));
    expect((await awaitingAsync(a.invoiceId, 'cs_async', false)).data).toMatchObject({ applied: true });
    expect((await rearm(a.invoiceId, null)).data).toMatchObject({ applied: false });
    // awaiting on a mismatched session does nothing; clearing lets the client retry.
    expect((await awaitingAsync(a.invoiceId, 'cs_nope', false)).data).toMatchObject({ applied: false });
    expect((await awaitingAsync(a.invoiceId, 'cs_async', true)).data).toMatchObject({ applied: true, cleared: true });
    expect(await invoice(a.invoiceId)).toMatchObject({ awaiting_async_payment_at: null });

    // record on a VOID row is refused (the mint-vs-void race, sequentially).
    await svc.from('engagements').update({ stage: 'lost', lost_reason: 'x' }).eq('id', a.eid);
    expect((await recordCheckout(a.invoiceId, 2, 'cs_dead', future(HOUR))).data).toMatchObject({ applied: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// mark_engagement_invoice_paid
// ────────────────────────────────────────────────────────────────────────────
describe('mark_engagement_invoice_paid', () => {
  async function sentDeposit(lead: string = LEAD.a) {
    const a = await acceptedProposal(lead);
    const { data } = await issueDeposit(a.pid, 50);
    const invoiceId = data!.invoice_id as string;
    await recordCheckout(invoiceId, 0, 'cs_live', future(24 * HOUR));
    return { ...a, invoiceId };
  }

  test('sent → paid: PI stored, awaiting cleared, invoice_paid needs_attention, stage and won_at untouched', async () => {
    const { eid, invoiceId } = await sentDeposit();
    const before = await engagement(eid);
    const { data, error } = await markPaid(invoiceId, 'cs_live', 'pi_ok', 43750, 'usd');
    expect(error).toBeNull();
    expect(data).toMatchObject({ applied: true, engagement_id: eid, kind: 'deposit', amount: 43750, on_void: false });

    const row = await invoice(invoiceId);
    expect(row).toMatchObject({
      status: 'paid', stripe_payment_intent_id: 'pi_ok', awaiting_async_payment_at: null,
    });
    expect(row.paid_at).not.toBeNull();

    const evts = await events(eid, 'invoice_paid');
    expect(evts).toHaveLength(1);
    expect(evts[0]).toMatchObject({ actor: 'client', needs_attention: true });
    expect(evts[0].summary).toBe('Deposit received: $437.50');

    const after = await engagement(eid);
    expect(after.stage).toBe(before.stage);
    expect(after.won_at).toEqual(before.won_at);
  });

  test('replay of the SAME payment intent → already_paid, no second event', async () => {
    const { eid, invoiceId } = await sentDeposit();
    await markPaid(invoiceId, 'cs_live', 'pi_ok', 43750, 'usd');
    const { data } = await markPaid(invoiceId, 'cs_live', 'pi_ok', 43750, 'usd');
    expect(data).toEqual({ applied: false, reason: 'already_paid' });
    expect(await events(eid, 'invoice_paid')).toHaveLength(1);
    expect(await events(eid, 'invoice_duplicate_payment')).toHaveLength(0);
  });

  test('a DIFFERENT payment intent → duplicate_payment, one event naming both PIs, row unchanged', async () => {
    const { eid, invoiceId } = await sentDeposit();
    await markPaid(invoiceId, 'cs_live', 'pi_first', 43750, 'usd');
    const { data } = await markPaid(invoiceId, 'cs_second', 'pi_second', 43750, 'usd');
    expect(data).toMatchObject({ applied: false, reason: 'duplicate_payment', payment_intent_id: 'pi_second' });

    expect(await invoice(invoiceId)).toMatchObject({ status: 'paid', stripe_payment_intent_id: 'pi_first' });
    const dupes = await events(eid, 'invoice_duplicate_payment');
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toMatchObject({ actor: 'system', needs_attention: true });
    expect(dupes[0].summary).toContain('pi_second');
    expect(dupes[0].data).toMatchObject({
      payment_intent_id: 'pi_second', original_payment_intent_id: 'pi_first',
    });
  });

  test('unknown invoice → not_found; wrong amount or currency → invoice_amount_mismatch, row unchanged', async () => {
    const { invoiceId } = await sentDeposit();
    expect((await markPaid(ZERO_UUID, 'cs_x', 'pi_x', 1, 'usd')).data).toEqual({ applied: false, reason: 'not_found' });
    expect((await markPaid(invoiceId, 'cs_live', 'pi_x', 43700, 'usd')).error?.message).toContain('invoice_amount_mismatch');
    expect((await markPaid(invoiceId, 'cs_live', 'pi_x', 43750, 'jpy')).error?.message).toContain('invoice_amount_mismatch');
    expect(await invoice(invoiceId)).toMatchObject({ status: 'sent', stripe_payment_intent_id: null });
  });

  test('the guard: paid→void, paid→sent, a direct paid_at edit, an identity edit, and the PI unique index', async () => {
    const { eid, pid, invoiceId } = await sentDeposit();
    await markPaid(invoiceId, 'cs_live', 'pi_guard', 43750, 'usd');

    const now = new Date().toISOString();
    const voidAttempt = await svc
      .from('engagement_invoices')
      .update({ status: 'void', voided_at: now, void_reason: 'nope' })
      .eq('id', invoiceId);
    expect(voidAttempt.error?.message).toContain('invoice_transition_invalid');

    const sentAttempt = await svc.from('engagement_invoices').update({ status: 'sent' }).eq('id', invoiceId);
    expect(sentAttempt.error?.message).toContain('invoice_transition_invalid');

    const paidAtAttempt = await svc.from('engagement_invoices').update({ paid_at: now }).eq('id', invoiceId);
    expect(paidAtAttempt.error?.message).toContain('invoice_payment_locked');

    const labelAttempt = await svc.from('engagement_invoices').update({ label: 'renamed' }).eq('id', invoiceId);
    expect(labelAttempt.error?.message).toContain('invoice_identity_immutable');
    const emailAttempt = await svc
      .from('engagement_invoices').update({ recipient_email: 'other@fixture.local' }).eq('id', invoiceId);
    expect(emailAttempt.error?.message).toContain('invoice_identity_immutable');

    // uq_engagement_invoices_payment_intent: a second row cannot take pi_guard.
    const { data: balanceRow } = await svc
      .from('engagement_invoices').select('id').eq('engagement_id', eid).eq('kind', 'balance').single();
    const { error: dupPi } = await svc
      .from('engagement_invoices')
      .update({
        status: 'sent', sent_at: now,
      })
      .eq('id', balanceRow!.id);
    expect(dupPi).toBeNull();
    const { error: dupPi2 } = await svc
      .from('engagement_invoices')
      .update({ status: 'paid', paid_at: now, stripe_payment_intent_id: 'pi_guard' })
      .eq('id', balanceRow!.id);
    expect(dupPi2?.code).toBe('23505');
    expect(pid).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// mark_engagement_invoice_refunded
// ────────────────────────────────────────────────────────────────────────────
describe('mark_engagement_invoice_refunded', () => {
  async function paidDeposit(lead: string, opts: AcceptedOpts = {}) {
    const a = await acceptedProposal(lead, opts);
    const { data } = await issueDeposit(a.pid, 50);
    const invoiceId = data!.invoice_id as string;
    const amount = (data!.amount as number);
    await recordCheckout(invoiceId, 0, `cs_${lead.slice(-4)}`, future(24 * HOUR));
    await markPaid(invoiceId, `cs_${lead.slice(-4)}`, `pi_${lead.slice(-4)}`, amount, opts.currency === 'JPY' ? 'jpy' : 'usd');
    return { ...a, invoiceId, amount, pi: `pi_${lead.slice(-4)}` };
  }

  test('full refund → refunded, partial:false, needs_attention', async () => {
    const { eid, invoiceId, amount, pi } = await paidDeposit(LEAD.a);
    const { data, error } = await markRefunded(pi, amount);
    expect(error).toBeNull();
    expect(data).toMatchObject({ applied: true, partial: false });
    expect(await invoice(invoiceId)).toMatchObject({ status: 'refunded', amount_refunded: amount });

    const evts = await events(eid, 'invoice_refunded');
    expect(evts).toHaveLength(1);
    expect(evts[0]).toMatchObject({ actor: 'system', needs_attention: true });
    expect(evts[0].summary).toContain('(full)');
    expect(evts[0].data).toMatchObject({ partial: false, amount_refunded: amount });
  });

  test('partial then the rest: 30000 of 66000 → partial, then 66000 grows it → full, second event', async () => {
    const { eid, invoiceId, pi } = await paidDeposit(LEAD.ja, {
      currency: 'JPY', totalBuild: 132000, totalMonthly: 30000,
    });
    expect((await markRefunded(pi, 30000)).data).toMatchObject({ applied: true, partial: true });
    expect(await invoice(invoiceId)).toMatchObject({ status: 'refunded', amount_refunded: 30000 });
    expect((await events(eid, 'invoice_refunded'))[0].summary).toContain('¥30,000 of ¥66,000 (partial)');

    expect((await markRefunded(pi, 66000)).data).toMatchObject({ applied: true, partial: false });
    expect(await invoice(invoiceId)).toMatchObject({ amount_refunded: 66000 });
    const evts = await events(eid, 'invoice_refunded');
    expect(evts).toHaveLength(2);
    expect(evts[1].summary).toContain('¥66,000 of ¥66,000 (full)');

    // A replay of the same cumulative figure is a no-op.
    expect((await markRefunded(pi, 66000)).data).toEqual({ applied: false, reason: 'already_refunded' });
    expect(await events(eid, 'invoice_refunded')).toHaveLength(2);
  });

  test('a sent invoice → not_paid; an unknown PI → not_found; a shrinking refund is rejected', async () => {
    const a = await acceptedProposal(LEAD.b);
    const { data } = await issueDeposit(a.pid, 50);
    const sentId = data!.invoice_id as string;
    // The RPC finds by payment intent, so a still-`sent` row is only reachable
    // once one is attached (the `sent` shape CHECK permits that).
    const { error: attachErr } = await svc
      .from('engagement_invoices').update({ stripe_payment_intent_id: 'pi_not_paid' }).eq('id', sentId);
    expect(attachErr).toBeNull();
    expect((await markRefunded('pi_not_paid', 100)).data).toEqual({ applied: false, reason: 'not_paid' });
    expect((await markRefunded('pi_unknown', 100)).data).toEqual({ applied: false, reason: 'not_found' });
    expect((await markRefunded(null as unknown as string, 100)).data).toEqual({ applied: false, reason: 'not_found' });

    const paid = await paidDeposit(LEAD.c);
    await markRefunded(paid.pi, paid.amount);
    const shrink = await svc
      .from('engagement_invoices').update({ amount_refunded: 1 }).eq('id', paid.invoiceId);
    expect(shrink.error?.message).toContain('invoice_refund_shrunk');
  });

  test('a refunded invoice can be voided (refunded → void)', async () => {
    const { pid, invoiceId, amount, pi, eid } = await paidDeposit(LEAD.a);
    await markRefunded(pi, amount);
    const { data } = await voidAcceptance(pid, 'refunded, deal off');
    expect(data).toMatchObject({ applied: true, invoices_voided: 2 });
    expect(await invoice(invoiceId)).toMatchObject({ status: 'void' });
    expect((await invoice(invoiceId)).void_reason).toContain('Acceptance voided: refunded, deal off');
    expect(await events(eid, 'invoice_voided')).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// The amended void RPC and the amended terminal sweep
// ────────────────────────────────────────────────────────────────────────────
describe('void_engagement_proposal_acceptance (amended)', () => {
  test('a sent deposit + a draft balance both void, two events, 074 return shape intact', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    await issueDeposit(pid, 50);
    const { data, error } = await voidAcceptance(pid, 'wrong tier');
    expect(error).toBeNull();
    expect(data).toEqual({ applied: true, stage_reverted: true, invoices_voided: 2 });

    const rows = await invoicesOf(eid);
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.status).toBe('void');
      expect(r.void_reason).toBe('Acceptance voided: wrong tier');
      expect(r.voided_at).not.toBeNull();
    }
    const voidedEvents = await events(eid, 'invoice_voided');
    expect(voidedEvents).toHaveLength(2);
    expect(voidedEvents[0].actor).toBe('admin');
    expect((await proposal(pid)).status).toBe('voided');
    expect((await engagement(eid)).stage).toBe('proposal');
  });

  test('a PAID deposit REFUSES the void and nothing changes', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    const { data: issued } = await issueDeposit(pid, 50);
    const invoiceId = issued!.invoice_id as string;
    await recordCheckout(invoiceId, 0, 'cs_paid', future(24 * HOUR));
    await markPaid(invoiceId, 'cs_paid', 'pi_paid', 43750, 'usd');

    const { data, error } = await voidAcceptance(pid, 'too late');
    expect(error).toBeNull();
    expect(data).toEqual({ applied: false, reason: 'invoice_paid' });
    expect((await proposal(pid)).status).toBe('accepted');
    expect(await invoice(invoiceId)).toMatchObject({ status: 'paid' });
    const e = await engagement(eid);
    expect(e.stage).toBe('build');
    expect(e.contract_value).toBe(87500);
  });

  test('with no invoices at all the 074 behaviour is unchanged (invoices_voided 0)', async () => {
    const { pid } = await acceptedProposal(LEAD.a);
    expect((await voidAcceptance(pid, 'changed my mind')).data).toEqual({
      applied: true, stage_reverted: true, invoices_voided: 0,
    });
  });
});

describe('terminal sweep (amended)', () => {
  test('stage → lost voids the sent deposit with a system event; a paid one is untouched; reopening leaves it void', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    await issueDeposit(pid, 50);
    const { deposit } = await depositAndBalance(eid);
    const depositId = deposit!.id as string;

    await svc.from('engagements').update({ stage: 'lost', lost_reason: 'gone quiet' }).eq('id', eid);
    expect(await invoice(depositId)).toMatchObject({ status: 'void', void_reason: 'Engagement marked lost' });
    const voidedEvents = await events(eid, 'invoice_voided');
    expect(voidedEvents).toHaveLength(2); // deposit + draft balance
    expect(voidedEvents[0].actor).toBe('system');

    await svc.from('engagements').update({ stage: 'build' }).eq('id', eid);
    expect(await invoice(depositId)).toMatchObject({ status: 'void' });

    const paidCase = await acceptedProposal(LEAD.b);
    const { data: issued } = await issueDeposit(paidCase.pid, 100);
    const paidId = issued!.invoice_id as string;
    await recordCheckout(paidId, 0, 'cs_keep', future(24 * HOUR));
    await markPaid(paidId, 'cs_keep', 'pi_keep', 87500, 'usd');
    await svc.from('engagements').update({ stage: 'closed' }).eq('id', paidCase.eid);
    expect(await invoice(paidId)).toMatchObject({ status: 'paid' });
    expect(await events(paidCase.eid, 'invoice_voided')).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Deliverables
// ────────────────────────────────────────────────────────────────────────────
describe('engagement_deliverables', () => {
  test('the guard owns delivered_at: fills it, clears it, and PRESERVES it on an ordinary edit', async () => {
    const { eid } = await acceptedProposal(LEAD.a);
    const { data, error } = await svc
      .from('engagement_deliverables')
      .insert({ engagement_id: eid, title: 'Homepage redesign', status: 'delivered' })
      .select('*')
      .single();
    expect(error).toBeNull();
    const id = data!.id as string;
    const firstDelivered = data!.delivered_at as string;
    expect(firstDelivered).not.toBeNull();

    // Ordinary edit with delivered_at OMITTED → the original survives.
    const { data: edited } = await svc
      .from('engagement_deliverables')
      .update({ title: 'Homepage redesign v2', notes_md: 'note' })
      .eq('id', id)
      .select('*')
      .single();
    expect(edited!.delivered_at).toBe(firstDelivered);

    // Ordinary edit that explicitly NULLs it → still the original.
    const { data: nulled } = await svc
      .from('engagement_deliverables')
      .update({ delivered_at: null, due_on: '2026-10-01' })
      .eq('id', id)
      .select('*')
      .single();
    expect(nulled!.delivered_at).toBe(firstDelivered);

    // Back to planned → cleared. Forward again → a NEW timestamp.
    const { data: planned } = await svc
      .from('engagement_deliverables').update({ status: 'planned' }).eq('id', id).select('*').single();
    expect(planned!.delivered_at).toBeNull();
    const { data: accepted } = await svc
      .from('engagement_deliverables').update({ status: 'accepted' }).eq('id', id).select('*').single();
    expect(accepted!.delivered_at).not.toBeNull();
  });

  test('engagement_id is immutable; a 201-char title is rejected; FK cascade and SET NULL', async () => {
    const one = await acceptedProposal(LEAD.a);
    const two = await acceptedProposal(LEAD.b);
    const { data } = await svc
      .from('engagement_deliverables')
      .insert({ engagement_id: one.eid, proposal_id: one.pid, title: 'Booking flow' })
      .select('id')
      .single();
    const id = data!.id as string;

    const moved = await svc.from('engagement_deliverables').update({ engagement_id: two.eid }).eq('id', id);
    expect(moved.error?.message).toContain('deliverable_identity_immutable');

    const { error: tooLong } = await svc
      .from('engagement_deliverables')
      .insert({ engagement_id: one.eid, title: 'T'.repeat(201) });
    expect(tooLong?.code).toBe('23514');

    // ON DELETE SET NULL from the proposal…
    await svc.from('engagement_proposals').delete().eq('id', one.pid);
    const { data: orphan } = await svc.from('engagement_deliverables').select('*').eq('id', id).single();
    expect(orphan!.proposal_id).toBeNull();
    expect(orphan!.engagement_id).toBe(one.eid);

    // …and CASCADE from the engagement.
    await svc.from('engagements').delete().eq('id', one.eid);
    const { data: gone } = await svc.from('engagement_deliverables').select('id').eq('id', id);
    expect(gone ?? []).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Two-connection races (no deadlock, one clean verdict each)
// ────────────────────────────────────────────────────────────────────────────
describe('lock-order races', () => {
  async function issuedDeposit(lead: string) {
    const a = await acceptedProposal(lead);
    const { data } = await issueDeposit(a.pid, 50);
    const invoiceId = data!.invoice_id as string;
    await recordCheckout(invoiceId, 0, `cs_race_${lead.slice(-4)}`, future(24 * HOUR));
    return { ...a, invoiceId, sessionId: `cs_race_${lead.slice(-4)}` };
  }

  test('(1a) void commits first → the waiting mark_paid records void→paid', async () => {
    const { eid, pid, invoiceId, sessionId } = await issuedDeposit(LEAD.a);
    await withPg(async (x) => {
      await x.query('BEGIN');
      // X holds the head of the lock order.
      await x.query('select id from public.engagements where id = $1 for update', [eid]);
      const y = markPaid(invoiceId, sessionId, 'pi_race_a', 43750, 'usd');
      await sleep(500);
      expect(await invoice(invoiceId)).toMatchObject({ status: 'sent' }); // Y is blocked
      const r = await x.query('select public.void_engagement_proposal_acceptance($1, $2) as r', [pid, 'race a']);
      expect(r.rows[0].r).toMatchObject({ applied: true });
      await x.query('COMMIT');
      const { data, error } = await y;
      expect(error).toBeNull();
      expect(error?.message ?? '').not.toMatch(/deadlock/i);
      expect(data).toMatchObject({ applied: true, on_void: true });
    });
    const row = await invoice(invoiceId);
    expect(row).toMatchObject({ status: 'paid' });
    expect(row.voided_at).not.toBeNull();
  });

  test('(1b) mark_paid commits first → the waiting void returns invoice_paid and the proposal stays accepted', async () => {
    const { eid, pid, invoiceId, sessionId } = await issuedDeposit(LEAD.b);
    await withPg(async (x) => {
      await x.query('BEGIN');
      await x.query('select id from public.engagements where id = $1 for update', [eid]);
      const y = voidAcceptance(pid, 'race b');
      await sleep(500);
      expect((await proposal(pid)).status).toBe('accepted'); // Y is blocked
      const r = await x.query('select public.mark_engagement_invoice_paid($1, $2, $3, $4, $5) as r', [
        invoiceId, sessionId, 'pi_race_b', 43750, 'usd',
      ]);
      expect(r.rows[0].r).toMatchObject({ applied: true });
      await x.query('COMMIT');
      const { data, error } = await y;
      expect(error).toBeNull();
      expect(data).toEqual({ applied: false, reason: 'invoice_paid' });
    });
    expect((await proposal(pid)).status).toBe('accepted');
    expect(await invoice(invoiceId)).toMatchObject({ status: 'paid' });
  });

  test('(2) two concurrent mark_paid with the same session and PI → exactly one applied, one event', async () => {
    const { eid, invoiceId, sessionId } = await issuedDeposit(LEAD.c);
    const [first, second] = await Promise.all([
      markPaid(invoiceId, sessionId, 'pi_double', 43750, 'usd'),
      markPaid(invoiceId, sessionId, 'pi_double', 43750, 'usd'),
    ]);
    for (const r of [first, second]) {
      expect(r.error).toBeNull();
      expect(r.error?.message ?? '').not.toMatch(/deadlock/i);
    }
    const applied = [first, second].filter((r) => r.data?.applied === true);
    const noop = [first, second].filter((r) => (r.data as { reason?: string } | null)?.reason === 'already_paid');
    expect(applied).toHaveLength(1);
    expect(noop).toHaveLength(1);
    expect(await events(eid, 'invoice_paid')).toHaveLength(1);
    expect(await events(eid, 'invoice_duplicate_payment')).toHaveLength(0);
  });

  test('(3) mint vs void: begin returns attempt 0, the void commits, record CAS refuses', async () => {
    const a = await acceptedProposal(LEAD.d);
    const { data: issued } = await issueDeposit(a.pid, 50);
    const invoiceId = issued!.invoice_id as string;

    const { data: begun } = await beginCheckout(invoiceId, a.hash);
    expect(begun).toMatchObject({ applied: true, attempt: 0 });

    expect((await voidAcceptance(a.pid, 'mid-mint')).data).toMatchObject({ applied: true });

    const { data: recorded } = await recordCheckout(invoiceId, 0, 'cs_orphan', future(24 * HOUR));
    expect(recorded).toMatchObject({ applied: false });
    expect(await invoice(invoiceId)).toMatchObject({ status: 'void', stripe_checkout_session_id: null });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Hygiene + the view
// ────────────────────────────────────────────────────────────────────────────
describe('hygiene and the view', () => {
  test('no event carries a 64-hex string or a checkout.stripe.com URL, after issue, mint and paid', async () => {
    const { eid, pid, hash, token } = await acceptedProposal(LEAD.a);
    const { data: issued } = await issueDeposit(pid, 50);
    const invoiceId = issued!.invoice_id as string;

    const check = async (label: string) => {
      for (const e of await events(eid)) {
        expect(JSON.stringify(e.data ?? {}), `${label} ${e.kind} data`).not.toMatch(/[0-9a-f]{64}/);
        expect(String(e.summary ?? ''), `${label} ${e.kind} summary`).not.toMatch(/[0-9a-f]{64}/);
        expect(JSON.stringify(e.data ?? {}), `${label} ${e.kind} data`).not.toContain('checkout.stripe.com');
        expect(String(e.summary ?? ''), `${label} ${e.kind} summary`).not.toContain('checkout.stripe.com');
        expect(JSON.stringify(e.data ?? {}), `${label} ${e.kind} data`).not.toContain(token);
      }
    };
    await check('after issue');

    await beginCheckout(invoiceId, hash);
    await recordCheckout(invoiceId, 0, 'cs_hygiene', future(24 * HOUR));
    await check('after mint');

    await markPaid(invoiceId, 'cs_hygiene', 'pi_hygiene', 43750, 'usd');
    await check('after paid');

    // No column holds the Checkout URL — only the session id.
    const row = await invoice(invoiceId);
    for (const key of Object.keys(row)) {
      expect(String(row[key]), key).not.toContain('checkout.stripe.com');
    }
  });

  test('the view reads the live deposit and the build-phase deliverable counters', async () => {
    const { eid, pid } = await acceptedProposal(LEAD.a);
    const { data: issued } = await issueDeposit(pid, 50);
    const invoiceId = issued!.invoice_id as string;
    await svc.from('engagement_deliverables').insert([
      { engagement_id: eid, title: 'Homepage redesign', phase: 'build', status: 'planned' },
      { engagement_id: eid, title: 'Booking flow', phase: 'build', status: 'planned' },
      { engagement_id: eid, title: 'Launch checks', phase: 'launch', status: 'planned' },
    ]);

    const admin = await userClient(USERS.honuvibe_admin);
    const read = async () => {
      const { data, error } = await admin
        .from('engagement_list')
        .select('deposit_invoice_id, deposit_status, deposit_amount, deposit_paid_at, deliverables_open_count, deliverables_total_count')
        .eq('id', eid)
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    };

    expect(await read()).toMatchObject({
      deposit_invoice_id: invoiceId,
      deposit_status: 'sent',
      deposit_amount: 43750,
      deposit_paid_at: null,
      deliverables_open_count: 2,
      deliverables_total_count: 3,
    });

    await recordCheckout(invoiceId, 0, 'cs_view', future(24 * HOUR));
    await markPaid(invoiceId, 'cs_view', 'pi_view', 43750, 'usd');
    const paidRow = await read();
    expect(paidRow).toMatchObject({ deposit_status: 'paid', deposit_amount: 43750 });
    expect(paidRow.deposit_paid_at).not.toBeNull();

    // A paid deposit REFUSES the void, so the view keeps reading it.
    expect((await voidAcceptance(pid, 'done testing')).data).toEqual({ applied: false, reason: 'invoice_paid' });
    expect(await read()).toMatchObject({ deposit_status: 'paid' });

    // A voided (unpaid) deposit drops out of the view's deposit slot.
    const other = await acceptedProposal(LEAD.b);
    await issueDeposit(other.pid, 50);
    const admin2 = await userClient(USERS.honuvibe_admin);
    const readOther = async () => {
      const { data, error } = await admin2
        .from('engagement_list')
        .select('deposit_invoice_id, deposit_status')
        .eq('id', other.eid)
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    };
    expect(await readOther()).toMatchObject({ deposit_status: 'sent' });
    expect((await voidAcceptance(other.pid, 'not going ahead')).data).toMatchObject({ applied: true });
    expect(await readOther()).toEqual({ deposit_invoice_id: null, deposit_status: null });
  });
});
