/**
 * Partner membership spine — RPC behaviour.
 *
 * Concurrency, retry/idempotency, the joined_no_seat → seat_granted upgrade,
 * the invite lifecycle, webhook fulfillment dedupe, and removal atomicity.
 * All of it against a real database, through the same service-role path the
 * routes use.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { serviceClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import {
  SPINE,
  seedSpinePartners,
  seedUser,
  spineUserId,
  resetSpineData,
  createSeatBlock,
  createJoinCode,
  getSeatBlock,
  daysFromNow,
  auditCount,
} from './helpers/partner-spine';

const admin = serviceClient();

const U = {
  a: spineUserId('d001'),
  b: spineUserId('d002'),
  c: spineUserId('d003'),
  d: spineUserId('d004'),
  e: spineUserId('d005'),
  f: spineUserId('d006'),
  g: spineUserId('d007'),
  h: spineUserId('d008'),
};
const ALL_USERS = Object.values(U);

type RedeemResult = {
  outcome: string;
  seat_granted?: boolean;
  has_seat?: boolean;
  partner_slug?: string;
  reason?: string;
};

async function redeem(userId: string, code: string): Promise<RedeemResult> {
  const { data, error } = await admin.rpc('redeem_partner_code', {
    p_user_id: userId,
    p_code: code,
  });
  if (error) throw error;
  return data as RedeemResult;
}

async function accept(userId: string, tokenHash: string): Promise<RedeemResult> {
  const { data, error } = await admin.rpc('accept_partner_invite', {
    p_user_id: userId,
    p_token_hash: tokenHash,
  });
  if (error) throw error;
  return data as RedeemResult;
}

async function ledgerRows(codeId: string) {
  const { data, error } = await admin
    .from('partner_code_redemptions')
    .select('user_id, outcome, created_at, updated_at')
    .eq('code_id', codeId);
  if (error) throw error;
  return data ?? [];
}

async function membership(userId: string, partnerId: string) {
  const { data } = await admin
    .from('partner_members')
    .select('status, joined_via, joined_at, activated_at, removed_at')
    .eq('user_id', userId)
    .eq('partner_id', partnerId)
    .maybeSingle();
  return data;
}

async function activeGrants(blockId: string): Promise<number> {
  const { count } = await admin
    .from('partner_seat_grants')
    .select('id', { count: 'exact', head: true })
    .eq('seat_block_id', blockId)
    .is('revoked_at', null);
  return count ?? 0;
}

beforeAll(async () => {
  await seedFixtures();
  await seedSpinePartners();
  for (const id of ALL_USERS) await seedUser(id);
}, 120_000);

beforeEach(async () => {
  await resetSpineData(ALL_USERS);
});

// ---------------------------------------------------------------------------
// redeem_partner_code — happy paths and refusals
// ---------------------------------------------------------------------------

describe('redeem_partner_code', () => {
  it('joins a member and returns partner branding for the success screen', async () => {
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'JOINME23',
    });

    const result = await redeem(U.a, code);
    expect(result.outcome).toBe('joined');
    expect(result.partner_slug).toBe('spine-alpha');

    const row = await membership(U.a, SPINE.partners.alpha);
    expect(row?.status).toBe('active');
    expect(row?.joined_via).toBe('join_code');
  });

  it('normalizes a lowercase, padded code', async () => {
    await createJoinCode({ partnerId: SPINE.partners.alpha, code: 'NORMAL23' });
    expect((await redeem(U.a, '  normal23 ')).outcome).toBe('joined');
  });

  it('refuses a deactivated code, an unknown code and a malformed code identically', async () => {
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'DEADCODE',
      isActive: false,
    });
    expect((await redeem(U.a, code)).outcome).toBe('invalid');
    expect((await redeem(U.a, 'NOSUCH23')).outcome).toBe('invalid');
    expect((await redeem(U.a, 'oops')).outcome).toBe('invalid');
  });

  it('refuses an expired code', async () => {
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'EXPIRE23',
      expiresAt: daysFromNow(-1),
    });
    expect((await redeem(U.a, code)).outcome).toBe('expired');
  });

  it('refuses everyone when the partner is deactivated', async () => {
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.inactive,
      code: 'INACTIV2',
    });
    expect((await redeem(U.a, code)).outcome).toBe('invalid');
    expect(await membership(U.a, SPINE.partners.inactive)).toBeNull();
  });

  it('returns a defined conflict — never a raw constraint error — for a second partner', async () => {
    const alpha = await createJoinCode({ partnerId: SPINE.partners.alpha, code: 'ALPHA234' });
    const beta = await createJoinCode({ partnerId: SPINE.partners.beta, code: 'BETA2345' });

    expect((await redeem(U.a, alpha.code)).outcome).toBe('joined');
    const conflict = await redeem(U.a, beta.code);
    expect(conflict.outcome).toBe('conflict');

    expect(await membership(U.a, SPINE.partners.beta)).toBeNull();
    expect(await ledgerRows(beta.id)).toHaveLength(0);
  });

  it('reactivates a removed membership in the SAME partner', async () => {
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'REJOIN23',
    });
    await redeem(U.a, code);
    const joinedAt = (await membership(U.a, SPINE.partners.alpha))!.joined_at;

    await admin.rpc('remove_partner_member', {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'admin',
      p_reason: 'test',
    });

    const again = await redeem(U.a, code);
    expect(again.outcome).toBe('joined');

    const row = await membership(U.a, SPINE.partners.alpha);
    expect(row?.status).toBe('active');
    expect(row?.removed_at).toBeNull();
    // joined_at is the first-ever join and is never rewritten.
    expect(row?.joined_at).toBe(joinedAt);
    expect(new Date(row!.activated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(joinedAt).getTime(),
    );

    // Rejoining reuses the single ledger row — no second use consumed.
    expect(await ledgerRows(id)).toHaveLength(1);
  });

  it('exhausts at max_uses and stops consuming', async () => {
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'CAPPED23',
      maxUses: 2,
    });

    expect((await redeem(U.a, code)).outcome).toBe('joined');
    expect((await redeem(U.b, code)).outcome).toBe('joined');
    expect((await redeem(U.c, code)).outcome).toBe('exhausted');

    expect(await ledgerRows(id)).toHaveLength(2);
    expect(await membership(U.c, SPINE.partners.alpha)).toBeNull();
  });

  it('a repeat redemption by an existing member is a true no-op', async () => {
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'REPEAT23',
    });
    expect((await redeem(U.a, code)).outcome).toBe('joined');
    expect((await redeem(U.a, code)).outcome).toBe('already_member');
    expect(await ledgerRows(id)).toHaveLength(1);
  });

  it('does not create a ledger row when the user is already a member via another route', async () => {
    await admin.from('partner_members').insert({
      partner_id: SPINE.partners.alpha,
      user_id: U.a,
      status: 'active',
      joined_via: 'invite',
    });
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'NOOPCODE',
    });

    expect((await redeem(U.a, code)).outcome).toBe('already_member');
    expect(await ledgerRows(id)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Seats
// ---------------------------------------------------------------------------

describe('redeem_partner_code — seats', () => {
  it('grants a seat and ledgers it as seat_granted', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 2 });
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'SEATED23',
      seatBlockId: blockId,
    });

    const result = await redeem(U.a, code);
    expect(result.outcome).toBe('joined');
    expect(result.seat_granted).toBe(true);
    expect(result.has_seat).toBe(true);
    expect(await activeGrants(blockId)).toBe(1);

    const rows = await ledgerRows(id);
    expect(rows).toHaveLength(1);
    expect(rows[0].outcome).toBe('seat_granted');
  });

  it('joins without a seat when the block is full, and ledgers joined_no_seat', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 1 });
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'ONESEAT2',
      seatBlockId: blockId,
    });

    expect((await redeem(U.a, code)).outcome).toBe('joined');
    const second = await redeem(U.b, code);
    expect(second.outcome).toBe('joined_no_seat');
    expect(second.has_seat).toBe(false);

    const rows = await ledgerRows(id);
    expect(rows.map((r) => r.outcome).sort()).toEqual(['joined_no_seat', 'seat_granted']);
    expect(await activeGrants(blockId)).toBe(1);
  });

  it('upgrades joined_no_seat → seat_granted on retry once a seat frees, without consuming a use', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 1 });
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'UPGRADE2',
      seatBlockId: blockId,
    });

    await redeem(U.a, code);
    expect((await redeem(U.b, code)).outcome).toBe('joined_no_seat');
    const usesBefore = (await ledgerRows(id)).length;

    // First holder's seat is released.
    await admin
      .from('partner_seat_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('seat_block_id', blockId)
      .eq('user_id', U.a);

    const retry = await redeem(U.b, code);
    expect(retry.seat_granted).toBe(true);
    expect(retry.has_seat).toBe(true);

    const rows = await ledgerRows(id);
    expect(rows).toHaveLength(usesBefore); // usage unchanged
    expect(rows.find((r) => r.user_id === U.b)!.outcome).toBe('seat_granted');
    expect(await activeGrants(blockId)).toBe(1);
  });

  it('upgrades even when the code is AT max_uses — the ledger lookup precedes the cap', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 1 });
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'CAPUPGR2',
      seatBlockId: blockId,
      maxUses: 2,
    });

    await redeem(U.a, code);
    expect((await redeem(U.b, code)).outcome).toBe('joined_no_seat');
    // Code is now exhausted for anyone new.
    expect((await redeem(U.c, code)).outcome).toBe('exhausted');

    await admin
      .from('partner_seat_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('seat_block_id', blockId)
      .eq('user_id', U.a);

    const retry = await redeem(U.b, code);
    expect(retry.seat_granted).toBe(true);

    const rows = await ledgerRows(id);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.user_id === U.b)!.outcome).toBe('seat_granted');
  });

  it('does not re-grant a seat the member previously had revoked', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'REVOKED2',
      seatBlockId: blockId,
    });

    await redeem(U.a, code);
    await admin.rpc('remove_partner_member', {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'admin',
      p_reason: 'test',
    });
    expect(await activeGrants(blockId)).toBe(0);

    const again = await redeem(U.a, code);
    expect(again.outcome).toBe('seat_revoked_previously');
    expect(again.has_seat).toBe(false);
    expect(await activeGrants(blockId)).toBe(0);

    // Membership DID reactivate, so the ledger records a durable change and the
    // row downgrades from seat_granted to joined_no_seat.
    expect((await membership(U.a, SPINE.partners.alpha))?.status).toBe('active');
    const rows = await ledgerRows(id);
    expect(rows).toHaveLength(1);
    expect(rows[0].outcome).toBe('joined_no_seat');
  });

  it('never grants a seat before the block window OPENS', async () => {
    // Grant-time and entitlement-time must use the identical predicate: a seat
    // handed out early would report has_seat while has_vault_access still says
    // no.
    const blockId = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 5,
      startDays: 5,
      endDays: 60,
    });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'FUTUREW2',
      seatBlockId: blockId,
    });

    const result = await redeem(U.a, code);
    expect(result.outcome).toBe('joined_no_seat');
    expect(result.has_seat).toBe(false);
    expect(await activeGrants(blockId)).toBe(0);
    expect(await admin.rpc('has_vault_access', { uid: U.a }).then((r) => r.data)).toBe(false);
  });

  it('never grants a seat on a block whose window has closed', async () => {
    const blockId = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 5,
      startDays: -30,
      endDays: -1,
    });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'PASTWIN2',
      seatBlockId: blockId,
    });

    expect((await redeem(U.a, code)).outcome).toBe('joined_no_seat');
    expect(await activeGrants(blockId)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------

describe('concurrency', () => {
  it('N parallel redemptions never oversubscribe a smaller block', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'RACESEAT',
      seatBlockId: blockId,
    });

    const results = await Promise.all(ALL_USERS.map((u) => redeem(u, code)));
    const seated = results.filter((r) => r.seat_granted).length;

    expect(seated).toBe(3);
    expect(await activeGrants(blockId)).toBe(3);
    expect(results.filter((r) => r.outcome === 'joined').length).toBe(3);
    expect(results.filter((r) => r.outcome === 'joined_no_seat').length).toBe(
      ALL_USERS.length - 3,
    );
  });

  it('max_uses holds under parallel redemption, independently of seat capacity', async () => {
    const { code, id } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'RACECAP2',
      maxUses: 4,
    });

    const results = await Promise.all(ALL_USERS.map((u) => redeem(u, code)));
    expect(results.filter((r) => r.outcome === 'joined')).toHaveLength(4);
    expect(results.filter((r) => r.outcome === 'exhausted')).toHaveLength(
      ALL_USERS.length - 4,
    );
    expect(await ledgerRows(id)).toHaveLength(4);
  });

  it('one user redeeming two partners at once ends with exactly one membership', async () => {
    const alpha = await createJoinCode({ partnerId: SPINE.partners.alpha, code: 'TWOWAYA2' });
    const beta = await createJoinCode({ partnerId: SPINE.partners.beta, code: 'TWOWAYB2' });

    const [r1, r2] = await Promise.all([redeem(U.a, alpha.code), redeem(U.a, beta.code)]);
    const outcomes = [r1.outcome, r2.outcome].sort();
    expect(outcomes).toEqual(['conflict', 'joined']);

    const { data: rows } = await admin
      .from('partner_members')
      .select('partner_id')
      .eq('user_id', U.a)
      .eq('status', 'active');
    expect(rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

describe('invite lifecycle', () => {
  const hash = (n: string) => n.padStart(64, '0');

  async function createInvite(params: {
    email: string;
    tokenHash: string;
    seatBlockId?: string | null;
    expiresAt?: string;
    partnerId?: string;
  }) {
    const { data, error } = await admin.rpc('create_partner_invite', {
      p_partner_id: params.partnerId ?? SPINE.partners.alpha,
      p_email: params.email,
      p_invited_by: FIXTURES.users.honuvibe_admin,
      p_token_hash: params.tokenHash,
      p_seat_block_id: params.seatBlockId ?? null,
      p_expires_at: params.expiresAt ?? daysFromNow(7),
      p_audit_source: 'admin',
    });
    if (error) throw error;
    return data as { outcome: string; invite_id?: string };
  }

  it('accepts an invite bound to the caller’s canonical email', async () => {
    const created = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('a1'),
    });
    expect(created.outcome).toBe('created');

    const result = await accept(U.a, hash('a1'));
    expect(result.outcome).toBe('joined');
    expect((await membership(U.a, SPINE.partners.alpha))?.joined_via).toBe('invite');

    const { data: invite } = await admin
      .from('partner_invites')
      .select('status, accepted_by')
      .eq('token_hash', hash('a1'))
      .single();
    expect(invite!.status).toBe('accepted');
    expect(invite!.accepted_by).toBe(U.a);
  });

  it('rejects acceptance from the wrong account and leaves the invite pending', async () => {
    await createInvite({ email: `${U.a}@fixture.local`, tokenHash: hash('a2') });

    const result = await accept(U.b, hash('a2'));
    expect(result.outcome).toBe('invalid');
    expect(result.reason).toBe('email_mismatch');

    const { data: invite } = await admin
      .from('partner_invites')
      .select('status')
      .eq('token_hash', hash('a2'))
      .single();
    expect(invite!.status).toBe('pending');
    expect(await membership(U.b, SPINE.partners.alpha)).toBeNull();
  });

  it('a conflict leaves the invite pending — nothing is consumed', async () => {
    const beta = await createJoinCode({ partnerId: SPINE.partners.beta, code: 'OTHERPT2' });
    await redeem(U.a, beta.code);

    await createInvite({ email: `${U.a}@fixture.local`, tokenHash: hash('a3') });
    expect((await accept(U.a, hash('a3'))).outcome).toBe('conflict');

    const { data: invite } = await admin
      .from('partner_invites')
      .select('status')
      .eq('token_hash', hash('a3'))
      .single();
    expect(invite!.status).toBe('pending');
  });

  it('resend rotates the token — the old one is dead immediately', async () => {
    const created = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('a4'),
    });

    const { error } = await admin.rpc('resend_partner_invite', {
      p_invite_id: created.invite_id,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_token_hash: hash('a5'),
      p_expires_at: daysFromNow(7),
      p_audit_source: 'admin',
    });
    expect(error).toBeNull();

    expect((await accept(U.a, hash('a4'))).outcome).toBe('invalid');
    expect((await accept(U.a, hash('a5'))).outcome).toBe('joined');
  });

  it('revoke then accept: acceptance observes revoked and fails', async () => {
    const created = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('a6'),
    });
    await admin.rpc('revoke_partner_invite', {
      p_invite_id: created.invite_id,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_reason: 'test',
    });

    const result = await accept(U.a, hash('a6'));
    expect(result.outcome).toBe('invalid');
    expect(result.reason).toBe('revoked');
    expect(await membership(U.a, SPINE.partners.alpha)).toBeNull();
  });

  it('accept then revoke: revoke observes accepted and returns a defined no-op', async () => {
    const created = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('a7'),
    });
    expect((await accept(U.a, hash('a7'))).outcome).toBe('joined');

    const { data } = await admin.rpc('revoke_partner_invite', {
      p_invite_id: created.invite_id,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_reason: 'too late',
    });
    expect((data as { outcome: string; status: string }).outcome).toBe('not_pending');
    expect((data as { status: string }).status).toBe('accepted');
    expect((await membership(U.a, SPINE.partners.alpha))?.status).toBe('active');
  });

  it('accept and revoke racing each other produce exactly one serialized winner', async () => {
    const created = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('a8'),
    });

    const [acceptResult, revokeResult] = await Promise.all([
      accept(U.a, hash('a8')),
      admin.rpc('revoke_partner_invite', {
        p_invite_id: created.invite_id,
        p_actor_id: FIXTURES.users.honuvibe_admin,
        p_audit_source: 'admin',
        p_reason: 'race',
      }),
    ]);

    const { data: invite } = await admin
      .from('partner_invites')
      .select('status')
      .eq('token_hash', hash('a8'))
      .single();
    const revoked = (revokeResult.data as { outcome: string }).outcome;

    if (invite!.status === 'accepted') {
      expect(acceptResult.outcome).toBe('joined');
      expect(revoked).toBe('not_pending');
      expect((await membership(U.a, SPINE.partners.alpha))?.status).toBe('active');
    } else {
      expect(invite!.status).toBe('revoked');
      expect(revoked).toBe('revoked');
      expect(acceptResult.outcome).toBe('invalid');
      expect(await membership(U.a, SPINE.partners.alpha)).toBeNull();
    }
  });

  it('a time-expired pending invite does not block a replacement', async () => {
    const first = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('a9'),
      expiresAt: daysFromNow(-1),
    });
    expect(first.outcome).toBe('created');

    const second = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('b1'),
    });
    expect(second.outcome).toBe('created');

    const { data: rows } = await admin
      .from('partner_invites')
      .select('status')
      .eq('partner_id', SPINE.partners.alpha)
      .eq('email', `${U.a}@fixture.local`);
    expect(rows!.map((r) => r.status).sort()).toEqual(['expired', 'pending']);
  });

  it('a live pending invite is not silently replaced', async () => {
    await createInvite({ email: `${U.a}@fixture.local`, tokenHash: hash('b2') });
    const again = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('b3'),
    });
    expect(again.outcome).toBe('already_pending');
  });

  it('materializes an expired status at acceptance time', async () => {
    await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('b4'),
      expiresAt: daysFromNow(-1),
    });

    expect((await accept(U.a, hash('b4'))).outcome).toBe('expired');
    const { data: invite } = await admin
      .from('partner_invites')
      .select('status')
      .eq('token_hash', hash('b4'))
      .single();
    expect(invite!.status).toBe('expired');
  });

  it('grants a seat when the invite carries one', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 1 });
    await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('b5'),
      seatBlockId: blockId,
    });

    const result = await accept(U.a, hash('b5'));
    expect(result.outcome).toBe('joined');
    expect(result.seat_granted).toBe(true);
    expect(await activeGrants(blockId)).toBe(1);
  });

  it('an ACCEPTED invite is spent — a removed member cannot replay it to restore themselves', async () => {
    // Without this, remove_partner_member would be undoable by its own target:
    // the invite email is still sitting in their inbox.
    const created = await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('c1'),
    });
    expect((await accept(U.a, hash('c1'))).outcome).toBe('joined');

    await admin.rpc('remove_partner_member', {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'admin',
      p_reason: 'removed for cause',
    });

    const replay = await accept(U.a, hash('c1'));
    expect(replay.outcome).toBe('invalid');
    expect(replay.reason).toBe('already_accepted');
    expect((await membership(U.a, SPINE.partners.alpha))?.status).toBe('removed');
    void created;
  });

  it('a double-click on a live acceptance is still idempotent', async () => {
    await createInvite({ email: `${U.a}@fixture.local`, tokenHash: hash('c2') });
    expect((await accept(U.a, hash('c2'))).outcome).toBe('joined');

    const second = await accept(U.a, hash('c2'));
    expect(second.outcome).toBe('already_member');
    expect(second.partner_slug).toBe('spine-alpha');
    expect((await membership(U.a, SPINE.partners.alpha))?.status).toBe('active');
  });

  it('refuses acceptance into a deactivated partner', async () => {
    await createInvite({
      email: `${U.a}@fixture.local`,
      tokenHash: hash('b6'),
      partnerId: SPINE.partners.inactive,
    });
    const result = await accept(U.a, hash('b6'));
    expect(result.outcome).toBe('invalid');
    expect(result.reason).toBe('partner_inactive');
  });
});

// ---------------------------------------------------------------------------
// Webhook fulfillment
// ---------------------------------------------------------------------------

describe('fulfill_partner_membership', () => {
  async function fulfill(userId: string, partnerId: string, ref: string) {
    const { data, error } = await admin.rpc('fulfill_partner_membership', {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_stripe_ref: ref,
    });
    if (error) throw error;
    return data as { outcome: string; replayed: boolean };
  }

  it('creates membership on the first delivery and dedupes on replay', async () => {
    const ref = `cs_fulfil_${Date.now()}_1`;
    const auditBefore = await auditCount(SPINE.partners.alpha, 'member_joined');

    const first = await fulfill(U.a, SPINE.partners.alpha, ref);
    expect(first.outcome).toBe('fulfilled');
    expect(first.replayed).toBe(false);

    const replay = await fulfill(U.a, SPINE.partners.alpha, ref);
    expect(replay.outcome).toBe('fulfilled');
    expect(replay.replayed).toBe(true);

    const { data: rows } = await admin
      .from('partner_members')
      .select('user_id')
      .eq('user_id', U.a);
    expect(rows).toHaveLength(1);

    // The replay wrote no second activation audit row.
    expect(await auditCount(SPINE.partners.alpha, 'member_joined')).toBe(auditBefore + 1);
  });

  it('never leaves a committed "processing" event row', async () => {
    const ref = `cs_fulfil_${Date.now()}_2`;
    await fulfill(U.a, SPINE.partners.alpha, ref);

    const { data } = await admin
      .from('partner_fulfillment_events')
      .select('outcome')
      .eq('stripe_ref', ref)
      .single();
    expect(data!.outcome).not.toBe('processing');

    const { count } = await admin
      .from('partner_fulfillment_events')
      .select('id', { count: 'exact', head: true })
      .eq('outcome', 'processing');
    expect(count).toBe(0);
  });

  it('raises on a stripe_ref reused with DIFFERENT params', async () => {
    const ref = `cs_fulfil_${Date.now()}_3`;
    await fulfill(U.a, SPINE.partners.alpha, ref);

    const { error } = await admin.rpc('fulfill_partner_membership', {
      p_user_id: U.b,
      p_partner_id: SPINE.partners.alpha,
      p_stripe_ref: ref,
    });
    expect(error).not.toBeNull();
  });

  it('keeps the existing tenancy and audits a conflict for a cross-partner purchase', async () => {
    const alpha = await createJoinCode({ partnerId: SPINE.partners.alpha, code: 'KEEPMEA2' });
    await redeem(U.a, alpha.code);

    const before = await auditCount(SPINE.partners.beta, 'self_pay_attribution_conflict');
    const result = await fulfill(U.a, SPINE.partners.beta, `cs_conflict_${Date.now()}`);
    expect(result.outcome).toBe('conflict');
    expect(await auditCount(SPINE.partners.beta, 'self_pay_attribution_conflict')).toBe(
      before + 1,
    );

    const { data: rows } = await admin
      .from('partner_members')
      .select('partner_id')
      .eq('user_id', U.a)
      .eq('status', 'active');
    expect(rows).toHaveLength(1);
    expect(rows![0].partner_id).toBe(SPINE.partners.alpha);
  });

  it('repairs the "enrollment exists, membership missing" case on a later delivery', async () => {
    // Simulate a prior fulfillment that never wrote membership.
    const first = await fulfill(U.a, SPINE.partners.alpha, `cs_repair_${Date.now()}_a`);
    expect(first.outcome).toBe('fulfilled');

    // A different session for the same user+partner — membership already active.
    const second = await fulfill(U.a, SPINE.partners.alpha, `cs_repair_${Date.now()}_b`);
    expect(second.outcome).toBe('repaired');

    const { data: rows } = await admin
      .from('partner_members')
      .select('user_id')
      .eq('user_id', U.a)
      .eq('status', 'active');
    expect(rows).toHaveLength(1);
  });

  it('a replayed webhook for a DELETED user never fulfills anew', async () => {
    const doomed = spineUserId('d0ff');
    await seedUser(doomed);
    const ref = `cs_deleted_${Date.now()}`;

    expect((await fulfill(doomed, SPINE.partners.alpha, ref)).outcome).toBe('fulfilled');
    await admin.auth.admin.deleteUser(doomed);

    // Membership cascaded away with the user; the event row survives.
    const replay = await fulfill(doomed, SPINE.partners.alpha, ref);
    expect(replay.replayed).toBe(true);

    const { data: rows } = await admin
      .from('partner_members')
      .select('user_id')
      .eq('partner_id', SPINE.partners.alpha)
      .eq('user_id', doomed);
    expect(rows ?? []).toHaveLength(0);

    await admin.from('partner_fulfillment_events').delete().eq('stripe_ref', ref);
  });
});

// ---------------------------------------------------------------------------
// Removal
// ---------------------------------------------------------------------------

describe('remove_partner_member', () => {
  it('removes membership, revokes seats and audits — in one transaction', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'REMOVME2',
      seatBlockId: blockId,
    });
    await redeem(U.a, code);
    expect(await activeGrants(blockId)).toBe(1);

    const removedBefore = await auditCount(SPINE.partners.alpha, 'member_removed');
    const { data } = await admin.rpc('remove_partner_member', {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'admin',
      p_reason: 'left the programme',
    });

    expect((data as { outcome: string; seats_revoked: number }).outcome).toBe('removed');
    expect((data as { seats_revoked: number }).seats_revoked).toBe(1);
    expect(await activeGrants(blockId)).toBe(0);
    expect((await membership(U.a, SPINE.partners.alpha))?.status).toBe('removed');
    expect(await auditCount(SPINE.partners.alpha, 'member_removed')).toBe(removedBefore + 1);
  });

  it('is idempotent and reports a defined result for a non-member', async () => {
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'IDEMPOT2',
    });
    await redeem(U.a, code);

    const args = {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'admin',
      p_reason: null,
    };
    expect(((await admin.rpc('remove_partner_member', args)).data as { outcome: string }).outcome)
      .toBe('removed');
    expect(((await admin.rpc('remove_partner_member', args)).data as { outcome: string }).outcome)
      .toBe('already_removed');

    const { data: none } = await admin.rpc('remove_partner_member', {
      ...args,
      p_user_id: U.h,
    });
    expect((none as { outcome: string }).outcome).toBe('not_found');
  });

  it('leaves an independently paid subscription untouched', async () => {
    await seedUser(U.a, {
      subscription_tier: 'vault',
      subscription_status: 'active',
    });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'PAIDSUB2',
    });
    await redeem(U.a, code);

    await admin.rpc('remove_partner_member', {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'admin',
      p_reason: null,
    });

    const { data: profile } = await admin
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', U.a)
      .single();
    expect(profile!.subscription_tier).toBe('vault');
    expect(profile!.subscription_status).toBe('active');
    expect(await admin.rpc('has_vault_access', { uid: U.a }).then((r) => r.data)).toBe(true);

    // Reset for the other tests in this file.
    await seedUser(U.a);
  });

  it('rolls the WHOLE removal back when the audit write fails', async () => {
    // Forced failure: an out-of-vocabulary source trips the audit CHECK inside
    // log_partner_audit, which runs in the same transaction as the membership
    // update and the seat revocation. If any of the three could commit alone,
    // a member could end up removed with their seat still live (or vice versa).
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'ATOMIC23',
      seatBlockId: blockId,
    });
    await redeem(U.a, code);
    expect(await activeGrants(blockId)).toBe(1);

    const { error } = await admin.rpc('remove_partner_member', {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'not_a_valid_source',
      p_reason: null,
    });
    expect(error).not.toBeNull();

    expect((await membership(U.a, SPINE.partners.alpha))?.status).toBe('active');
    expect(await activeGrants(blockId)).toBe(1);
  });

  it('only revokes seats belonging to THAT partner', async () => {
    const alphaBlock = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 3,
    });
    const betaBlock = await createSeatBlock({ partnerId: SPINE.partners.beta, seatsTotal: 3 });

    await admin.from('partner_members').insert({
      partner_id: SPINE.partners.alpha,
      user_id: U.a,
      status: 'active',
    });
    await admin.from('partner_seat_grants').insert([
      { seat_block_id: alphaBlock, user_id: U.a },
      { seat_block_id: betaBlock, user_id: U.a },
    ]);

    await admin.rpc('remove_partner_member', {
      p_partner_id: SPINE.partners.alpha,
      p_user_id: U.a,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_source: 'admin',
      p_reason: null,
    });

    expect(await activeGrants(alphaBlock)).toBe(0);
    expect(await activeGrants(betaBlock)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Admin compound mutations
// ---------------------------------------------------------------------------

describe('admin compound mutations', () => {
  it('upsert_seat_block refuses to drop seats below active usage', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'FLOOR234',
      seatBlockId: blockId,
    });
    await redeem(U.a, code);
    await redeem(U.b, code);

    const stored = await getSeatBlock(blockId);
    const { data } = await admin.rpc('upsert_seat_block', {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: stored.label,
      p_seats_total: 1,
      p_granted_tier: 'vault',
      p_access_starts_at: stored.access_starts_at,
      p_access_ends_at: stored.access_ends_at,
      p_block_source: stored.source,
      p_notes: null,
      p_is_active: true,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_confirm_impact: true,
      p_reason: null,
    });
    expect((data as { outcome: string; active_grants: number }).outcome).toBe(
      'below_active_usage',
    );
    expect((data as { active_grants: number }).active_grants).toBe(2);

    const { data: unchanged } = await admin
      .from('partner_seat_blocks')
      .select('seats_total')
      .eq('id', blockId)
      .single();
    expect(unchanged!.seats_total).toBe(3);
  });

  it('locks tier, start date and source once seats have been granted', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'LOCKED23',
      seatBlockId: blockId,
    });
    await redeem(U.a, code);

    const { data } = await admin.rpc('upsert_seat_block', {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: 'test block',
      p_seats_total: 3,
      p_granted_tier: 'vault',
      p_access_starts_at: daysFromNow(5), // moved
      p_access_ends_at: daysFromNow(30),
      p_block_source: 'purchased', // changed
      p_notes: null,
      p_is_active: true,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_confirm_impact: true,
      p_reason: null,
    });
    expect((data as { outcome: string }).outcome).toBe('immutable_field');
  });

  it('a label-only edit on a block WITH grants succeeds when timestamps round-trip exactly', async () => {
    // Regression guard for the admin editor: it keeps the block's raw ISO
    // timestamps in its draft. Re-deriving them (e.g. truncating to midnight)
    // would read as a change to the immutable access_starts_at and every edit
    // to a live block would fail.
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'ROUNDTR2',
      seatBlockId: blockId,
    });
    await redeem(U.a, code);

    const stored = await getSeatBlock(blockId);
    const { data } = await admin.rpc('upsert_seat_block', {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: 'Renamed block',
      p_seats_total: stored.seats_total,
      p_granted_tier: 'vault',
      p_access_starts_at: stored.access_starts_at,
      p_access_ends_at: stored.access_ends_at,
      p_block_source: stored.source,
      p_notes: 'edited',
      p_is_active: true,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_confirm_impact: false,
      p_reason: null,
    });
    expect((data as { outcome: string }).outcome).toBe('updated');

    const after = await getSeatBlock(blockId);
    expect(after.label).toBe('Renamed block');
    expect(after.access_starts_at).toBe(stored.access_starts_at);
  });

  it('keeps tier/start/source locked even after every seat is revoked', async () => {
    // Immutability keys on "has ever granted", not "currently active" — a block
    // that ledger rows and audit history already point at must not become
    // redefinable just because its seats were handed back.
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'EVERGRA2',
      seatBlockId: blockId,
    });
    await redeem(U.a, code);

    await admin
      .from('partner_seat_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('seat_block_id', blockId);
    expect(await activeGrants(blockId)).toBe(0);

    const stored = await getSeatBlock(blockId);
    const { data } = await admin.rpc('upsert_seat_block', {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: stored.label,
      p_seats_total: stored.seats_total,
      p_granted_tier: 'vault',
      p_access_starts_at: daysFromNow(5), // moved
      p_access_ends_at: stored.access_ends_at,
      p_block_source: stored.source,
      p_notes: null,
      p_is_active: true,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_confirm_impact: true,
      p_reason: null,
    });
    expect((data as { outcome: string; ever_granted: number }).outcome).toBe(
      'immutable_field',
    );
    expect((data as { ever_granted: number }).ever_granted).toBe(1);
  });

  it('requires an explicit confirmation before shortening the window', async () => {
    const blockId = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 3,
      endDays: 60,
    });
    const base = {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: 'test block',
      p_seats_total: 3,
      p_granted_tier: 'vault',
      p_access_starts_at: daysFromNow(-1),
      p_access_ends_at: daysFromNow(10),
      p_block_source: 'sponsored',
      p_notes: null,
      p_is_active: true,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_reason: null,
    };

    const refused = await admin.rpc('upsert_seat_block', {
      ...base,
      p_confirm_impact: false,
    });
    expect((refused.data as { outcome: string }).outcome).toBe('confirm_required');

    const shortenedBefore = await auditCount(SPINE.partners.alpha, 'block_shortened');
    const accepted = await admin.rpc('upsert_seat_block', {
      ...base,
      p_confirm_impact: true,
    });
    expect((accepted.data as { outcome: string }).outcome).toBe('updated');
    expect(await auditCount(SPINE.partners.alpha, 'block_shortened')).toBe(
      shortenedBefore + 1,
    );
  });

  it('extending the window needs no confirmation', async () => {
    const blockId = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 3,
      endDays: 10,
    });
    const { data } = await admin.rpc('upsert_seat_block', {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: 'test block',
      p_seats_total: 3,
      p_granted_tier: 'vault',
      p_access_starts_at: daysFromNow(-1),
      p_access_ends_at: daysFromNow(120),
      p_block_source: 'sponsored',
      p_notes: null,
      p_is_active: true,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_confirm_impact: false,
      p_reason: null,
    });
    expect((data as { outcome: string }).outcome).toBe('updated');
  });

  it('a bulk deactivation writes ONE summary audit row carrying the affected count', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 5 });
    const { code } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'BULKAUD2',
      seatBlockId: blockId,
    });
    await redeem(U.a, code);
    await redeem(U.b, code);
    await redeem(U.c, code);

    const stored = await getSeatBlock(blockId);
    const before = await auditCount(SPINE.partners.alpha, 'block_deactivated');
    await admin.rpc('upsert_seat_block', {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: stored.label,
      p_seats_total: 5,
      p_granted_tier: 'vault',
      p_access_starts_at: stored.access_starts_at,
      p_access_ends_at: stored.access_ends_at,
      p_block_source: stored.source,
      p_notes: null,
      p_is_active: false,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
      p_confirm_impact: true,
      p_reason: 'sponsor ended',
    });

    expect(await auditCount(SPINE.partners.alpha, 'block_deactivated')).toBe(before + 1);
    const { data: row } = await admin
      .from('partner_audit_log')
      .select('new_value')
      .eq('partner_id', SPINE.partners.alpha)
      .eq('action', 'block_deactivated')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect((row!.new_value as { affected_active_grants: number }).affected_active_grants).toBe(3);
  });

  it('upsert_join_code rolls the audit row back with the data when the write fails', async () => {
    await createJoinCode({ partnerId: SPINE.partners.alpha, code: 'TAKEN234' });
    const before = await auditCount(SPINE.partners.alpha, 'code_created');

    const { data } = await admin.rpc('upsert_join_code', {
      p_partner_id: SPINE.partners.beta,
      p_code_id: null,
      p_code: 'TAKEN234', // globally unique — collides
      p_seat_block_id: null,
      p_max_uses: null,
      p_expires_at: null,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
    });
    expect((data as { outcome: string }).outcome).toBe('code_taken');
    expect(await auditCount(SPINE.partners.alpha, 'code_created')).toBe(before);
  });

  it('upsert_seat_block rolls the block edit back when its audit write fails', async () => {
    const blockId = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 3,
      label: 'atomic block',
    });
    const stored = await getSeatBlock(blockId);

    const { error } = await admin.rpc('upsert_seat_block', {
      p_partner_id: SPINE.partners.alpha,
      p_block_id: blockId,
      p_label: 'renamed by a doomed transaction',
      p_seats_total: 9,
      p_granted_tier: 'vault',
      p_access_starts_at: stored.access_starts_at,
      p_access_ends_at: stored.access_ends_at,
      p_block_source: stored.source,
      p_notes: null,
      p_is_active: true,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'not_a_valid_source',
      p_confirm_impact: true,
      p_reason: null,
    });
    expect(error).not.toBeNull();

    const after = await getSeatBlock(blockId);
    expect(after.label).toBe('atomic block');
    expect(after.seats_total).toBe(3);
  });

  it('update_partner_benefits upserts and audits together', async () => {
    const before = await auditCount(SPINE.partners.alpha, 'benefits_updated');
    const { data } = await admin.rpc('update_partner_benefits', {
      p_partner_id: SPINE.partners.alpha,
      p_course_discount_pct: 25,
      p_stripe_coupon_id: 'test_coupon',
      p_included_tier: null,
      p_actor_id: FIXTURES.users.honuvibe_admin,
      p_audit_source: 'admin',
    });
    expect((data as { outcome: string }).outcome).toBe('updated');
    expect(await auditCount(SPINE.partners.alpha, 'benefits_updated')).toBe(before + 1);

    const { data: row } = await admin
      .from('partner_benefits')
      .select('course_discount_pct, stripe_coupon_id')
      .eq('partner_id', SPINE.partners.alpha)
      .single();
    expect(Number(row!.course_discount_pct)).toBe(25);
    expect(row!.stripe_coupon_id).toBe('test_coupon');

    await admin.from('partner_benefits').delete().eq('partner_id', SPINE.partners.alpha);
  });

  it('backfilled Vertice benefits keep the 40% perk with no coupon id in the migration', async () => {
    const { data } = await admin
      .from('partner_benefits')
      .select('course_discount_pct, stripe_coupon_id')
      .eq('partner_id', FIXTURES.partners.vertice)
      .maybeSingle();

    // The fixture partner is upserted by slug, so it IS the vertice-society row
    // the migration backfilled.
    if (data) {
      expect(Number(data.course_discount_pct)).toBe(40);
      expect(data.stripe_coupon_id).toBeNull();
    }
  });
});
