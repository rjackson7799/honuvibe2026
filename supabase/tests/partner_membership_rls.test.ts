/**
 * Partner membership spine — database constraints, RLS, and RPC authorization.
 *
 * Everything here runs against the database directly, never through the API.
 * The database is the only real boundary.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { serviceClient, anonClient, userClient } from './helpers/clients';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import {
  SPINE,
  seedSpinePartners,
  seedUser,
  spineUserId,
  resetSpineData,
  createSeatBlock,
  createJoinCode,
  daysFromNow,
} from './helpers/partner-spine';

const admin = serviceClient();

const USERS = {
  seatHolder: spineUserId('c001'),
  nonHolder: spineUserId('c002'),
  member: spineUserId('c003'),
  outsider: spineUserId('c004'),
};

beforeAll(async () => {
  await seedFixtures();
  await seedSpinePartners();
  for (const id of Object.values(USERS)) await seedUser(id);
}, 120_000);

beforeEach(async () => {
  await resetSpineData(Object.values(USERS));
});

// ---------------------------------------------------------------------------
// DB constraints
// ---------------------------------------------------------------------------

describe('DB constraints', () => {
  it('one-active-membership partial index rejects a second active partner', async () => {
    const first = await admin.from('partner_members').insert({
      partner_id: SPINE.partners.alpha,
      user_id: USERS.member,
      status: 'active',
    });
    expect(first.error).toBeNull();

    const second = await admin.from('partner_members').insert({
      partner_id: SPINE.partners.beta,
      user_id: USERS.member,
      status: 'active',
    });
    expect(second.error?.code).toBe('23505');
  });

  it('allows a removed membership alongside an active one in another partner', async () => {
    await admin.from('partner_members').insert({
      partner_id: SPINE.partners.alpha,
      user_id: USERS.member,
      status: 'removed',
      removed_at: daysFromNow(-1),
    });
    const second = await admin.from('partner_members').insert({
      partner_id: SPINE.partners.beta,
      user_id: USERS.member,
      status: 'active',
    });
    expect(second.error).toBeNull();
  });

  it('rejects membership statuses and roles outside the allowed sets', async () => {
    const badStatus = await admin.from('partner_members').insert({
      partner_id: SPINE.partners.alpha,
      user_id: USERS.member,
      status: 'pending',
    });
    expect(badStatus.error?.code).toBe('23514');

    const badRole = await admin.from('partner_members').insert({
      partner_id: SPINE.partners.alpha,
      user_id: USERS.member,
      role: 'partner_admin',
    });
    expect(badRole.error?.code).toBe('23514');
  });

  it('rejects a seat block whose window ends before it starts', async () => {
    const { error } = await admin.from('partner_seat_blocks').insert({
      partner_id: SPINE.partners.alpha,
      label: 'backwards',
      seats_total: 1,
      granted_tier: 'vault',
      access_starts_at: daysFromNow(10),
      access_ends_at: daysFromNow(1),
      source: 'sponsored',
    });
    expect(error?.code).toBe('23514');
  });

  it('rejects a non-vault granted_tier in v1', async () => {
    const { error } = await admin.from('partner_seat_blocks').insert({
      partner_id: SPINE.partners.alpha,
      label: 'community seats',
      seats_total: 1,
      granted_tier: 'community',
      access_starts_at: daysFromNow(-1),
      access_ends_at: daysFromNow(10),
      source: 'sponsored',
    });
    expect(error?.code).toBe('23514');
  });

  it('rejects a duplicate seat grant for the same (block, user)', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 5 });
    const first = await admin
      .from('partner_seat_grants')
      .insert({ seat_block_id: blockId, user_id: USERS.seatHolder });
    expect(first.error).toBeNull();

    const second = await admin
      .from('partner_seat_grants')
      .insert({ seat_block_id: blockId, user_id: USERS.seatHolder });
    expect(second.error?.code).toBe('23505');
  });

  it('enforces join-code normalization, charset and length', async () => {
    const lower = await admin.from('partner_join_codes').insert({
      partner_id: SPINE.partners.alpha,
      code: 'abcd2345',
    });
    expect(lower.error?.code).toBe('23514');

    const padded = await admin.from('partner_join_codes').insert({
      partner_id: SPINE.partners.alpha,
      code: ' ABCD2345 ',
    });
    expect(padded.error?.code).toBe('23514');

    const tooShort = await admin.from('partner_join_codes').insert({
      partner_id: SPINE.partners.alpha,
      code: 'ABC234',
    });
    expect(tooShort.error?.code).toBe('23514');

    const tooLong = await admin.from('partner_join_codes').insert({
      partner_id: SPINE.partners.alpha,
      code: 'A'.repeat(25),
    });
    expect(tooLong.error?.code).toBe('23514');

    const zeroChar = await admin.from('partner_join_codes').insert({
      partner_id: SPINE.partners.alpha,
      code: 'ABCD0234',
    });
    expect(zeroChar.error?.code).toBe('23514');
  });

  it('enforces invite email normalization', async () => {
    const blockId = null;
    const { error } = await admin.from('partner_invites').insert({
      partner_id: SPINE.partners.alpha,
      email: 'Mixed.Case@Example.COM',
      invited_by: FIXTURES.users.honuvibe_admin,
      token_hash: 'a'.repeat(64),
      seat_block_id: blockId,
      expires_at: daysFromNow(7),
    });
    expect(error?.code).toBe('23514');
  });

  it('allows only ONE pending invite per (partner, email)', async () => {
    const row = {
      partner_id: SPINE.partners.alpha,
      email: 'dup@example.com',
      invited_by: FIXTURES.users.honuvibe_admin,
      expires_at: daysFromNow(7),
    };
    const first = await admin
      .from('partner_invites')
      .insert({ ...row, token_hash: 'b'.repeat(64) });
    expect(first.error).toBeNull();

    const second = await admin
      .from('partner_invites')
      .insert({ ...row, token_hash: 'c'.repeat(64) });
    expect(second.error?.code).toBe('23505');

    // A revoked one does not block a replacement.
    await admin
      .from('partner_invites')
      .update({ status: 'revoked' })
      .eq('token_hash', 'b'.repeat(64));
    const third = await admin
      .from('partner_invites')
      .insert({ ...row, token_hash: 'd'.repeat(64) });
    expect(third.error).toBeNull();
  });

  it('composite FK rejects a join code pointing at ANOTHER partner’s seat block', async () => {
    const betaBlock = await createSeatBlock({
      partnerId: SPINE.partners.beta,
      seatsTotal: 5,
    });
    const { error } = await admin.from('partner_join_codes').insert({
      partner_id: SPINE.partners.alpha,
      code: 'CROSS234',
      seat_block_id: betaBlock,
    });
    expect(error?.code).toBe('23503');
  });

  it('composite FK rejects an invite pointing at ANOTHER partner’s seat block', async () => {
    const betaBlock = await createSeatBlock({
      partnerId: SPINE.partners.beta,
      seatsTotal: 5,
    });
    const { error } = await admin.from('partner_invites').insert({
      partner_id: SPINE.partners.alpha,
      email: 'cross@example.com',
      invited_by: FIXTURES.users.honuvibe_admin,
      token_hash: 'e'.repeat(64),
      seat_block_id: betaBlock,
      expires_at: daysFromNow(7),
    });
    expect(error?.code).toBe('23503');
  });

  it('enforces stripe_ref uniqueness on fulfillment events', async () => {
    const row = {
      stripe_ref: 'cs_unique_test_1',
      partner_id: SPINE.partners.alpha,
      user_id: USERS.member,
      outcome: 'fulfilled',
    };
    expect((await admin.from('partner_fulfillment_events').insert(row)).error).toBeNull();
    const second = await admin.from('partner_fulfillment_events').insert(row);
    expect(second.error?.code).toBe('23505');
  });

  it('RESTRICT on the ledger FK stops a code with usage history being deleted', async () => {
    const { id: codeId } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'HISTORY2',
    });
    await admin
      .from('partner_code_redemptions')
      .insert({ code_id: codeId, user_id: USERS.member, outcome: 'joined' });

    const { error } = await admin.from('partner_join_codes').delete().eq('id', codeId);
    expect(error?.code).toBe('23503');
  });

  it('deleting a redeemed user keeps the ledger row and the usage count', async () => {
    const doomed = spineUserId('c0de');
    await seedUser(doomed);
    const { id: codeId } = await createJoinCode({
      partnerId: SPINE.partners.alpha,
      code: 'DELETE23',
    });
    await admin
      .from('partner_code_redemptions')
      .insert({ code_id: codeId, user_id: doomed, outcome: 'joined' });

    const { error: delError } = await admin.auth.admin.deleteUser(doomed);
    expect(delError).toBeNull();

    const { data: rows } = await admin
      .from('partner_code_redemptions')
      .select('user_id')
      .eq('code_id', codeId);
    expect(rows).toHaveLength(1);
    expect(rows![0].user_id).toBeNull();
  });

  it('deleting a fulfilled user keeps the fulfillment event so replays still dedupe', async () => {
    const doomed = spineUserId('c0df');
    await seedUser(doomed);
    await admin.from('partner_fulfillment_events').insert({
      stripe_ref: 'cs_deleted_user_1',
      partner_id: SPINE.partners.alpha,
      user_id: doomed,
      outcome: 'fulfilled',
    });

    await admin.auth.admin.deleteUser(doomed);

    const { data } = await admin
      .from('partner_fulfillment_events')
      .select('user_id, outcome')
      .eq('stripe_ref', 'cs_deleted_user_1')
      .maybeSingle();
    expect(data).not.toBeNull();
    expect(data!.user_id).toBeNull();
    expect(data!.outcome).toBe('fulfilled');

    await admin
      .from('partner_fulfillment_events')
      .delete()
      .eq('stripe_ref', 'cs_deleted_user_1');
  });
});

// ---------------------------------------------------------------------------
// RPC authorization
// ---------------------------------------------------------------------------

describe('RPC authorization', () => {
  const MUTATING_RPCS: [string, Record<string, unknown>][] = [
    ['redeem_partner_code', { p_user_id: USERS.member, p_code: 'ABCD2345' }],
    ['accept_partner_invite', { p_user_id: USERS.member, p_token_hash: 'a'.repeat(64) }],
    [
      'remove_partner_member',
      {
        p_partner_id: SPINE.partners.alpha,
        p_user_id: USERS.member,
        p_actor_id: null,
        p_source: 'admin',
        p_reason: null,
      },
    ],
    [
      'fulfill_partner_membership',
      { p_user_id: USERS.member, p_partner_id: SPINE.partners.alpha, p_stripe_ref: 'cs_x' },
    ],
    [
      'create_partner_invite',
      {
        p_partner_id: SPINE.partners.alpha,
        p_email: 'x@example.com',
        p_invited_by: USERS.member,
        p_token_hash: 'f'.repeat(64),
        p_seat_block_id: null,
        p_expires_at: daysFromNow(7),
        p_audit_source: 'admin',
      },
    ],
    [
      'resend_partner_invite',
      {
        p_invite_id: '00000000-0000-0000-0000-000000000000',
        p_actor_id: null,
        p_token_hash: 'f'.repeat(64),
        p_expires_at: daysFromNow(7),
        p_audit_source: 'admin',
      },
    ],
    [
      'revoke_partner_invite',
      {
        p_invite_id: '00000000-0000-0000-0000-000000000000',
        p_actor_id: null,
        p_audit_source: 'admin',
        p_reason: null,
      },
    ],
    [
      'upsert_join_code',
      {
        p_partner_id: SPINE.partners.alpha,
        p_code_id: null,
        p_code: 'ZZZZ2345',
        p_seat_block_id: null,
        p_max_uses: null,
        p_expires_at: null,
        p_actor_id: null,
        p_audit_source: 'admin',
      },
    ],
    [
      'set_join_code_active',
      {
        p_code_id: '00000000-0000-0000-0000-000000000000',
        p_is_active: false,
        p_actor_id: null,
        p_audit_source: 'admin',
        p_reason: null,
      },
    ],
    [
      'upsert_seat_block',
      {
        p_partner_id: SPINE.partners.alpha,
        p_block_id: null,
        p_label: 'nope',
        p_seats_total: 1,
        p_granted_tier: 'vault',
        p_access_starts_at: daysFromNow(-1),
        p_access_ends_at: daysFromNow(10),
        p_block_source: 'sponsored',
        p_notes: null,
        p_is_active: true,
        p_actor_id: null,
        p_audit_source: 'admin',
        p_confirm_impact: false,
        p_reason: null,
      },
    ],
    [
      'update_partner_benefits',
      {
        p_partner_id: SPINE.partners.alpha,
        p_course_discount_pct: 10,
        p_stripe_coupon_id: null,
        p_included_tier: null,
        p_actor_id: null,
        p_audit_source: 'admin',
      },
    ],
    [
      'log_partner_audit',
      {
        p_partner_id: SPINE.partners.alpha,
        p_audit_source: 'admin',
        p_action: 'forged',
        p_actor_id: null,
        p_target_type: null,
        p_target_id: null,
        p_target_email: null,
        p_old_value: null,
        p_new_value: null,
        p_correlation_id: null,
        p_reason: null,
      },
    ],
  ];

  it('anonymous clients cannot execute ANY mutating RPC', async () => {
    const anon = anonClient();
    for (const [name, args] of MUTATING_RPCS) {
      const { error } = await anon.rpc(name, args);
      expect(error, `anon should not execute ${name}`).not.toBeNull();
    }
  });

  it('authenticated non-admin clients cannot execute ANY mutating RPC', async () => {
    const client = await userClient(USERS.member);
    for (const [name, args] of MUTATING_RPCS) {
      const { error } = await client.rpc(name, args);
      expect(error, `authenticated should not execute ${name}`).not.toBeNull();
    }
  });

  it('even a HonuVibe admin JWT cannot execute a mutating RPC directly', async () => {
    const client = await userClient(FIXTURES.users.honuvibe_admin);
    const { error } = await client.rpc('redeem_partner_code', {
      p_user_id: USERS.member,
      p_code: 'ABCD2345',
    });
    expect(error).not.toBeNull();
  });

  it('user A cannot redeem for user B — the route never passes a client id, and the RPC is unreachable anyway', async () => {
    const attacker = await userClient(USERS.outsider);
    const { error } = await attacker.rpc('redeem_partner_code', {
      p_user_id: USERS.member,
      p_code: 'ABCD2345',
    });
    expect(error).not.toBeNull();

    const { data: rows } = await admin
      .from('partner_members')
      .select('user_id')
      .eq('user_id', USERS.member);
    expect(rows ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// get_my_active_seat_grants — the one authenticated-EXECUTE exception
// ---------------------------------------------------------------------------

describe('get_my_active_seat_grants', () => {
  it('returns only the caller’s own active grants, with only the agreed fields', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 5 });
    await admin
      .from('partner_seat_grants')
      .insert({ seat_block_id: blockId, user_id: USERS.seatHolder });

    const holder = await userClient(USERS.seatHolder);
    const { data, error } = await holder.rpc('get_my_active_seat_grants');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Object.keys(data![0]).sort()).toEqual(
      [
        'access_ends_at',
        'access_starts_at',
        'granted_tier',
        'partner_id',
        'partner_name_en',
        'partner_name_jp',
        'partner_slug',
      ].sort(),
    );
    expect(data![0].partner_slug).toBe('spine-alpha');
    expect(data![0].partner_name_jp).toBe('スパイン・アルファ');

    const other = await userClient(USERS.nonHolder);
    const { data: none } = await other.rpc('get_my_active_seat_grants');
    expect(none).toHaveLength(0);
  });

  it('hides revoked, out-of-window and deactivated-block grants', async () => {
    const revokedBlock = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 5,
      label: 'revoked',
    });
    const futureBlock = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 5,
      startDays: 5,
      endDays: 30,
      label: 'future',
    });
    const deadBlock = await createSeatBlock({
      partnerId: SPINE.partners.alpha,
      seatsTotal: 5,
      isActive: false,
      label: 'dead',
    });

    await admin.from('partner_seat_grants').insert([
      { seat_block_id: revokedBlock, user_id: USERS.seatHolder, revoked_at: daysFromNow(-1) },
      { seat_block_id: futureBlock, user_id: USERS.seatHolder },
      { seat_block_id: deadBlock, user_id: USERS.seatHolder },
    ]);

    const holder = await userClient(USERS.seatHolder);
    const { data } = await holder.rpc('get_my_active_seat_grants');
    expect(data).toHaveLength(0);
  });

  it('returns nothing for an anonymous caller', async () => {
    const anon = anonClient();
    const { data, error } = await anon.rpc('get_my_active_seat_grants');
    // anon has no EXECUTE; if a future grant slipped in, the auth.uid() guard
    // still yields zero rows.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// End-to-end entitlement through a real authenticated NON-admin client
// ---------------------------------------------------------------------------

describe('seat entitlement end to end (authenticated non-admin)', () => {
  const PREMIUM_ITEM = '55555555-5555-5555-5555-555555555551';

  beforeEach(async () => {
    await admin.from('vault_article_bodies').delete().eq('content_item_id', PREMIUM_ITEM);
    await admin.from('content_items').delete().eq('id', PREMIUM_ITEM);
    const itemInsert = await admin.from('content_items').insert({
      id: PREMIUM_ITEM,
      title_en: 'Premium seat test article',
      content_type: 'article',
      source: 'honuvibe',
      access_tier: 'premium',
      is_published: true,
    });
    if (itemInsert.error) throw itemInsert.error;

    const bodyInsert = await admin.from('vault_article_bodies').insert({
      content_item_id: PREMIUM_ITEM,
      body_en: 'members only',
    });
    if (bodyInsert.error) throw bodyInsert.error;
  });

  it('a seat holder can read premium Vault content; a non-holder cannot', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 5 });
    await admin
      .from('partner_seat_grants')
      .insert({ seat_block_id: blockId, user_id: USERS.seatHolder });

    const holder = await userClient(USERS.seatHolder);
    const { data: allowed } = await holder
      .from('vault_article_bodies')
      .select('body_en')
      .eq('content_item_id', PREMIUM_ITEM);
    expect(allowed).toHaveLength(1);

    const outsider = await userClient(USERS.nonHolder);
    const { data: denied } = await outsider
      .from('vault_article_bodies')
      .select('body_en')
      .eq('content_item_id', PREMIUM_ITEM);
    expect(denied ?? []).toHaveLength(0);
  });

  it('access disappears the moment the block is deactivated', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 5 });
    await admin
      .from('partner_seat_grants')
      .insert({ seat_block_id: blockId, user_id: USERS.seatHolder });

    const holder = await userClient(USERS.seatHolder);
    expect(
      (
        await holder
          .from('vault_article_bodies')
          .select('body_en')
          .eq('content_item_id', PREMIUM_ITEM)
      ).data,
    ).toHaveLength(1);

    await admin.from('partner_seat_blocks').update({ is_active: false }).eq('id', blockId);

    expect(
      (
        await holder
          .from('vault_article_bodies')
          .select('body_en')
          .eq('content_item_id', PREMIUM_ITEM)
      ).data ?? [],
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// RLS exposure
// ---------------------------------------------------------------------------

describe('RLS exposure', () => {
  it('a partner admin cannot read partner_invites at all, and token_hash is not selectable', async () => {
    await admin.from('partner_invites').insert({
      partner_id: FIXTURES.partners.vertice,
      email: 'invitee@example.com',
      invited_by: FIXTURES.users.honuvibe_admin,
      token_hash: '1'.repeat(64),
      expires_at: daysFromNow(7),
    });

    const partnerAdmin = await userClient(FIXTURES.users.vertice_partner_admin);

    const { data: direct } = await partnerAdmin
      .from('partner_invites')
      .select('id, email')
      .eq('partner_id', FIXTURES.partners.vertice);
    expect(direct ?? []).toHaveLength(0);

    // The browse view exposes the row without the hash…
    const { data: browse, error: browseError } = await partnerAdmin
      .from('partner_invites_browse')
      .select('id, email, status')
      .eq('partner_id', FIXTURES.partners.vertice);
    expect(browseError).toBeNull();
    expect((browse ?? []).length).toBeGreaterThan(0);
    expect(Object.keys((browse ?? [])[0] ?? {})).not.toContain('token_hash');

    // …and token_hash is column-revoked, so even asking for it fails.
    const { error: hashError } = await partnerAdmin
      .from('partner_invites')
      .select('token_hash');
    expect(hashError).not.toBeNull();

    await admin.from('partner_invites').delete().eq('token_hash', '1'.repeat(64));
  });

  it('even a HonuVibe admin JWT cannot select token_hash', async () => {
    const hvAdmin = await userClient(FIXTURES.users.honuvibe_admin);
    const { error } = await hvAdmin.from('partner_invites').select('token_hash');
    expect(error).not.toBeNull();
  });

  it('a partner admin cannot read ANOTHER partner’s seat blocks or codes', async () => {
    await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    await createJoinCode({ partnerId: SPINE.partners.alpha, code: 'SECRET23' });

    const partnerAdmin = await userClient(FIXTURES.users.vertice_partner_admin);
    expect(
      (await partnerAdmin.from('partner_seat_blocks').select('id')).data ?? [],
    ).toHaveLength(0);
    expect(
      (await partnerAdmin.from('partner_join_codes').select('id')).data ?? [],
    ).toHaveLength(0);
  });

  it('anonymous clients see nothing on any spine table', async () => {
    await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 3 });
    await createJoinCode({ partnerId: SPINE.partners.alpha, code: 'ANONYM23' });

    const anon = anonClient();
    for (const table of [
      'partner_seat_blocks',
      'partner_join_codes',
      'partner_code_redemptions',
      'partner_seat_grants',
      'partner_invites',
      'partner_benefits',
      'partner_audit_log',
      'partner_fulfillment_events',
    ]) {
      const { data } = await anon.from(table).select('*');
      expect(data ?? [], `anon should read nothing from ${table}`).toHaveLength(0);
    }
  });

  it('partner_audit_log is append-only for anon, authenticated AND service_role', async () => {
    // Seed one row through the RPC (the only sanctioned write path).
    await admin.rpc('log_partner_audit', {
      p_partner_id: SPINE.partners.alpha,
      p_audit_source: 'system',
      p_action: 'append_only_probe',
      p_actor_id: null,
      p_target_type: null,
      p_target_id: null,
      p_target_email: null,
      p_old_value: null,
      p_new_value: null,
      p_correlation_id: null,
      p_reason: null,
    });

    const { data: row } = await admin
      .from('partner_audit_log')
      .select('id')
      .eq('action', 'append_only_probe')
      .limit(1)
      .maybeSingle();
    expect(row).not.toBeNull();

    // service_role bypasses RLS, so the GRANT layer is what has to stop it.
    const svcUpdate = await admin
      .from('partner_audit_log')
      .update({ reason: 'tampered' })
      .eq('id', row!.id);
    expect(svcUpdate.error).not.toBeNull();

    const svcDelete = await admin.from('partner_audit_log').delete().eq('id', row!.id);
    expect(svcDelete.error).not.toBeNull();

    const hvAdmin = await userClient(FIXTURES.users.honuvibe_admin);
    expect(
      (await hvAdmin.from('partner_audit_log').update({ reason: 'x' }).eq('id', row!.id)).error,
    ).not.toBeNull();
    expect(
      (await hvAdmin.from('partner_audit_log').delete().eq('id', row!.id)).error,
    ).not.toBeNull();

    const anon = anonClient();
    expect(
      (await anon.from('partner_audit_log').insert({
        partner_id: SPINE.partners.alpha,
        partner_slug: 'spine-alpha',
        source: 'admin',
        action: 'forged',
      })).error,
    ).not.toBeNull();
  });

  it('a member can read their own seat grants but not another member’s', async () => {
    const blockId = await createSeatBlock({ partnerId: SPINE.partners.alpha, seatsTotal: 5 });
    await admin.from('partner_seat_grants').insert([
      { seat_block_id: blockId, user_id: USERS.seatHolder },
      { seat_block_id: blockId, user_id: USERS.member },
    ]);

    const holder = await userClient(USERS.seatHolder);
    const { data } = await holder.from('partner_seat_grants').select('user_id');
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USERS.seatHolder);
  });
});
