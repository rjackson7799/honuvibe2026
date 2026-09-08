// @vitest-environment node
//
// The send/resend FAILURE CONTRACT (slice 5, migration 077).
//
// The one rule these tests exist to enforce: the invoice is `sent` the moment
// the RPC commits, and nothing after that may tell Ryan it isn't. Slice 4 got
// this wrong by accident — issueDeposit performed three THROWING reads after
// its RPC had already committed — so every post-commit boundary is pinned
// here, one test each.
import { beforeEach, describe, expect, test, vi } from 'vitest';

const emails = vi.hoisted(() => ({ send: vi.fn() }));
const internals = vi.hoisted(() => ({ rotate: vi.fn() }));
const supa = vi.hoisted(() => ({ admin: null as unknown, role: 'admin' as string }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./emails', () => ({ sendInvoiceRequestEmail: emails.send }));
vi.mock('./proposal-internals', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./proposal-internals')>()),
  rotateProposalToken: internals.rotate,
}));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => supa.admin,
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: supa.role } }) }) }),
    }),
  }),
}));

import { resendInvoiceEmail, sendBalanceInvoice } from './invoice-actions';

const IID = '11111111-1111-4111-8111-111111111111';
const PID = '22222222-2222-4222-8222-222222222222';
const EID = '33333333-3333-4333-8333-333333333333';

type Rows = {
  invoice?: Record<string, unknown> | null;
  proposal?: Record<string, unknown> | null;
  engagement?: Record<string, unknown> | null;
  liveInvoices?: Record<string, unknown>[];
};

const BALANCE = {
  id: IID,
  engagement_id: EID,
  proposal_id: PID,
  kind: 'balance',
  pct_of_build: 50,
  amount: 43750,
  currency: 'USD',
  status: 'sent',
  recipient_email: 'client@example.com',
  voided_at: null,
  sent_at: '2026-09-20T00:00:00.000Z',
  paid_at: null,
  refunded_at: null,
  amount_refunded: null,
  invoice_email_sent_at: null,
};
const PROPOSAL = { id: PID, status: 'accepted', locale: 'en', version: 1, access_token_hash: 'a'.repeat(64), valid_until: '2026-12-01' };
const ENGAGEMENT = { id: EID, stage: 'launch', title: 'Kailua Café', client_contact_email: 'client@example.com', client_contact_name: 'Kai' };

/** Records every write so the tests can assert on the stamp and the events. */
function makeAdmin(rows: Rows, cfg: { rpc?: unknown; rpcError?: unknown; readError?: string } = {}) {
  const updates: { table: string; patch: Record<string, unknown> }[] = [];
  const inserts: { table: string; row: Record<string, unknown> }[] = [];

  function read(table: string, filters: [string, unknown][]) {
    if (cfg.readError && table === cfg.readError) return { data: null, error: { message: 'read boom' } };
    if (table === 'engagement_invoices') {
      // liveInvoicesOf filters on proposal_id; loadInvoice filters on id.
      const byProposal = filters.some(([c]) => c === 'proposal_id');
      if (byProposal) return { data: rows.liveInvoices ?? [], error: null };
      return { data: rows.invoice ?? null, error: null };
    }
    if (table === 'engagement_proposals') return { data: rows.proposal ?? null, error: null };
    if (table === 'engagements') return { data: rows.engagement ?? null, error: null };
    return { data: null, error: null };
  }

  function builder(table: string) {
    const filters: [string, unknown][] = [];
    let patch: Record<string, unknown> | null = null;
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (c: string, v: unknown) => { filters.push([c, v]); return b; },
      is: (c: string, v: unknown) => { filters.push([c, v]); return b; },
      maybeSingle: async () => read(table, filters),
      single: async () => read(table, filters),
      update: (next: Record<string, unknown>) => { patch = next; return b; },
      insert: async (row: Record<string, unknown>) => { inserts.push({ table, row }); return { error: null }; },
      then: (resolve: (v: unknown) => unknown) => {
        if (patch) {
          updates.push({ table, patch });
          return Promise.resolve(resolve({ data: null, error: null }));
        }
        return Promise.resolve(resolve(read(table, filters)));
      },
    };
    return b;
  }

  return {
    client: {
      rpc: vi.fn(async () => (cfg.rpcError ? { data: null, error: cfg.rpcError } : { data: cfg.rpc ?? null, error: null })),
      from: (table: string) => builder(table),
    },
    updates,
    inserts,
  };
}

const APPLIED = { applied: true, invoice_id: IID, amount: 43750, currency: 'USD' };
const stampOf = (updates: { table: string; patch: Record<string, unknown> }[]) =>
  updates.filter((u) => u.table === 'engagement_invoices' && 'invoice_email_sent_at' in u.patch);
const failureEvents = (inserts: { table: string; row: Record<string, unknown> }[]) =>
  inserts.filter((i) => i.row.kind === 'notification_failed');

beforeEach(() => {
  supa.role = 'admin';
  emails.send.mockReset().mockResolvedValue({ ok: true, providerId: 'em_1' });
  internals.rotate.mockReset().mockResolvedValue({
    token: 'f'.repeat(64),
    expires: new Date('2026-10-21T00:00:00.000Z'),
    validUntil: '2026-12-01',
  });
});

function baseRows(over: Partial<Rows> = {}): Rows {
  return {
    invoice: BALANCE,
    proposal: PROPOSAL,
    engagement: ENGAGEMENT,
    liveInvoices: [BALANCE, { ...BALANCE, id: 'i-dep', kind: 'deposit', status: 'paid', paid_at: '2026-09-07T00:00:00.000Z' }],
    ...over,
  };
}

describe('sendBalanceInvoice — before the RPC commits, failures THROW', () => {
  test('a DB error is translated, not leaked', async () => {
    const { client } = makeAdmin(baseRows(), { rpcError: { message: 'error: invoice_not_billable_yet' } });
    supa.admin = client;
    await expect(sendBalanceInvoice(IID)).rejects.toThrow(/Launch/i);
  });

  test.each([
    ['already_sent', /already been sent/i],
    ['already_paid', /already been paid/i],
    ['voided', /voided/i],
  ])('the %s verdict gets its OWN sentence — never a blanket "already sent"', async (reason, shape) => {
    const { client } = makeAdmin(baseRows(), { rpc: { applied: false, reason } });
    supa.admin = client;
    await expect(sendBalanceInvoice(IID)).rejects.toThrow(shape);
  });

  test('a non-admin is refused before anything runs', async () => {
    supa.role = 'member';
    const { client } = makeAdmin(baseRows(), { rpc: APPLIED });
    supa.admin = client;
    await expect(sendBalanceInvoice(IID)).rejects.toThrow(/Not authorized/);
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe('sendBalanceInvoice — after the RPC commits, NOTHING throws', () => {
  test('the happy path emails and stamps', async () => {
    const { client, updates, inserts } = makeAdmin(baseRows(), { rpc: APPLIED });
    supa.admin = client;

    const result = await sendBalanceInvoice(IID);
    expect(result).toMatchObject({ invoiceId: IID, amount: 43750, currency: 'USD', sent: true, emailed: true });
    expect(result.reason).toBeUndefined();

    // The balance variant, carrying the PAID deposit for its copy.
    expect(emails.send).toHaveBeenCalledWith(expect.objectContaining({ variant: 'balance', depositStatus: 'paid' }));
    expect(stampOf(updates)).toEqual([{ table: 'engagement_invoices', patch: expect.objectContaining({ invoice_email_sent_at: expect.any(String) }) }]);
    expect(failureEvents(inserts)).toHaveLength(0);
  });

  test('a POST-COMMIT READ failure reports sent:true, never a throw', async () => {
    // The hole slice 4 left: three throwing reads after a committed RPC.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, inserts } = makeAdmin(baseRows(), { rpc: APPLIED, readError: 'engagement_proposals' });
    supa.admin = client;

    const result = await sendBalanceInvoice(IID);
    expect(result).toMatchObject({ sent: true, emailed: false, reason: 'lookup_failed' });
    expect(emails.send).not.toHaveBeenCalled();
    expect(failureEvents(inserts)).toHaveLength(0); // no engagement id to attach one to
  });

  test('a ROTATION failure reports sent:true and LEAVES the stamp alone', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    internals.rotate.mockRejectedValue(new Error('This proposal changed underneath you — reload.'));
    const { client, updates, inserts } = makeAdmin(baseRows(), { rpc: APPLIED });
    supa.admin = client;

    const result = await sendBalanceInvoice(IID);
    expect(result).toMatchObject({ sent: true, emailed: false, reason: 'link_rotation_failed' });
    expect(emails.send).not.toHaveBeenCalled();
    // The OLD token still works, so an earlier email is still valid.
    expect(stampOf(updates)).toHaveLength(0);
    expect(failureEvents(inserts)).toHaveLength(1);
  });

  test('a PROVIDER failure reports sent:true and CLEARS the stamp', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    emails.send.mockResolvedValue({ ok: false, error: 'rejected' });
    const { client, updates, inserts } = makeAdmin(baseRows(), { rpc: APPLIED });
    supa.admin = client;

    const result = await sendBalanceInvoice(IID);
    expect(result).toMatchObject({ sent: true, emailed: false, reason: 'email_failed' });
    // The token DID rotate, so any earlier email now carries a dead link and
    // the panel must stop claiming a successful delivery.
    expect(stampOf(updates)).toEqual([{ table: 'engagement_invoices', patch: { invoice_email_sent_at: null } }]);
    expect(failureEvents(inserts)).toHaveLength(1);
  });

  test('a STAMP failure still reports emailed:true — the email really went out', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = makeAdmin(baseRows(), { rpc: APPLIED });
    // Make only the stamp write fail.
    const original = client.from;
    client.from = (table: string) => {
      const b = original(table) as Record<string, unknown>;
      if (table === 'engagement_invoices') {
        const update = b.update as (p: Record<string, unknown>) => Record<string, unknown>;
        b.update = (patch: Record<string, unknown>) => {
          const inner = update(patch);
          inner.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ data: null, error: { message: 'stamp boom' } }));
          return inner;
        };
      }
      return b;
    };
    supa.admin = client;

    expect(await sendBalanceInvoice(IID)).toMatchObject({ sent: true, emailed: true });
  });

  test('no recipient anywhere is reported, not thrown', async () => {
    const rows = baseRows({
      invoice: { ...BALANCE, recipient_email: null },
      engagement: { ...ENGAGEMENT, client_contact_email: null },
    });
    const { client, inserts } = makeAdmin(rows, { rpc: APPLIED });
    supa.admin = client;

    expect(await sendBalanceInvoice(IID)).toMatchObject({ sent: true, emailed: false, reason: 'no_recipient' });
    expect(failureEvents(inserts)).toHaveLength(1);
  });

  test('the deposit is passed by STATUS, so a refunded one is not called received', async () => {
    const rows = baseRows({
      liveInvoices: [BALANCE, { ...BALANCE, id: 'i-dep', kind: 'deposit', status: 'refunded', paid_at: '2026-09-07T00:00:00.000Z', refunded_at: '2026-09-10T00:00:00.000Z' }],
    });
    const { client } = makeAdmin(rows, { rpc: APPLIED });
    supa.admin = client;

    await sendBalanceInvoice(IID);
    expect(emails.send).toHaveBeenCalledWith(expect.objectContaining({ depositStatus: 'refunded' }));
  });
});

describe('resendInvoiceEmail', () => {
  test('refuses a draft and a paid invoice with a state message', async () => {
    for (const [status, shape] of [['draft', /not been issued/i], ['paid', /nothing to request/i]] as const) {
      const { client } = makeAdmin(baseRows({ invoice: { ...BALANCE, status } }));
      supa.admin = client;
      await expect(resendInvoiceEmail(IID)).rejects.toThrow(shape);
    }
  });

  test('refuses on a TERMINAL engagement — a state 077 newly makes reachable', async () => {
    // 075 voided a sent balance on close, so this could not happen before.
    // Now the row survives, and emailing a link the mint RPC will refuse would
    // simply waste the client's time.
    for (const stage of ['closed', 'lost']) {
      const { client } = makeAdmin(baseRows({ engagement: { ...ENGAGEMENT, stage } }));
      supa.admin = client;
      await expect(resendInvoiceEmail(IID)).rejects.toThrow(/closed — reopen it/i);
      expect(emails.send).not.toHaveBeenCalled();
    }
  });

  test('resends a balance with the balance variant', async () => {
    const { client, updates } = makeAdmin(baseRows());
    supa.admin = client;

    expect(await resendInvoiceEmail(IID)).toMatchObject({ sent: true, emailed: true });
    expect(emails.send).toHaveBeenCalledWith(expect.objectContaining({ variant: 'balance' }));
    expect(stampOf(updates)).toHaveLength(1);
  });

  test('a resend whose email fails clears a PREVIOUSLY successful stamp', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    emails.send.mockResolvedValue({ ok: false, error: 'rejected' });
    const { client, updates } = makeAdmin(baseRows({ invoice: { ...BALANCE, invoice_email_sent_at: '2026-09-20T00:00:00.000Z' } }));
    supa.admin = client;

    expect(await resendInvoiceEmail(IID)).toMatchObject({ emailed: false, reason: 'email_failed' });
    expect(stampOf(updates)).toEqual([{ table: 'engagement_invoices', patch: { invoice_email_sent_at: null } }]);
  });

  test('a DEPOSIT resend uses the deposit variant and looks up no deposit row', async () => {
    const deposit = { ...BALANCE, kind: 'deposit', pct_of_build: 50 };
    const { client } = makeAdmin(baseRows({ invoice: deposit }));
    supa.admin = client;

    await resendInvoiceEmail(IID);
    expect(emails.send).toHaveBeenCalledWith(expect.objectContaining({ variant: 'deposit', depositStatus: null }));
  });
});
