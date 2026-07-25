import { serviceClient } from './clients';

/**
 * Fixtures for the partner membership spine (migration 064).
 *
 * Kept separate from helpers/fixtures.ts so the community-feed suite keeps its
 * exact, long-standing seed. Partners here are created once and NEVER deleted:
 * partner_audit_log holds a RESTRICT foreign key to partners on purpose, and
 * service_role has no DELETE on the audit log at all — which is itself part of
 * what these suites verify.
 */

export const SPINE = {
  partners: {
    alpha: '33333333-3333-3333-3333-333333333331',
    beta: '33333333-3333-3333-3333-333333333332',
    inactive: '33333333-3333-3333-3333-333333333333',
  },
} as const;

export function spineUserId(suffix: string): string {
  // 12 hex chars of caller-controlled suffix, zero-padded into a valid uuid.
  const tail = suffix.replace(/[^0-9a-f]/gi, '').toLowerCase().padStart(12, '0').slice(-12);
  return `44444444-4444-4444-4444-${tail}`;
}

export type SeededUser = {
  id: string;
  email: string;
};

/** Idempotently creates an auth user + its public.users row. */
export async function seedUser(
  id: string,
  overrides: Record<string, unknown> = {},
): Promise<SeededUser> {
  const admin = serviceClient();
  const email = `${id}@fixture.local`;

  const { error: createErr } = await admin.auth.admin.createUser({
    id,
    email,
    password: `fixture-pass-${id}`,
    email_confirm: true,
  });
  if (createErr && !/already been registered|already exists|duplicate/i.test(createErr.message)) {
    throw createErr;
  }

  const { error } = await admin
    .from('users')
    .upsert(
      {
        id,
        email,
        role: 'student',
        subscription_tier: 'free',
        subscription_status: null,
        subscription_expires_at: null,
        is_vertice_member: false,
        ...overrides,
      },
      { onConflict: 'id' },
    );
  if (error) throw error;

  return { id, email };
}

export async function seedSpinePartners(): Promise<void> {
  const admin = serviceClient();
  const { error } = await admin.from('partners').upsert(
    [
      {
        id: SPINE.partners.alpha,
        slug: 'spine-alpha',
        name_en: 'Spine Alpha',
        name_jp: 'スパイン・アルファ',
        is_active: true,
      },
      {
        id: SPINE.partners.beta,
        slug: 'spine-beta',
        name_en: 'Spine Beta',
        is_active: true,
      },
      {
        id: SPINE.partners.inactive,
        slug: 'spine-inactive',
        name_en: 'Spine Inactive',
        is_active: false,
      },
    ],
    { onConflict: 'id' },
  );
  if (error) throw error;
}

/**
 * Wipes the spine's mutable data for the scratch partners.
 *
 * Deletion order follows the RESTRICT foreign keys: ledger before codes, grants
 * and invites before blocks. partner_audit_log is deliberately NOT cleaned —
 * service_role cannot delete from it, so suites assert on deltas instead.
 */
export async function resetSpineData(userIds: string[] = []): Promise<void> {
  const admin = serviceClient();
  const partnerIds = Object.values(SPINE.partners);

  const { data: codes } = await admin
    .from('partner_join_codes')
    .select('id')
    .in('partner_id', partnerIds);
  const codeIds = (codes ?? []).map((c) => c.id);
  if (codeIds.length) {
    await admin.from('partner_code_redemptions').delete().in('code_id', codeIds);
    await admin.from('partner_join_codes').delete().in('id', codeIds);
  }

  const { data: blocks } = await admin
    .from('partner_seat_blocks')
    .select('id')
    .in('partner_id', partnerIds);
  const blockIds = (blocks ?? []).map((b) => b.id);
  if (blockIds.length) {
    await admin.from('partner_seat_grants').delete().in('seat_block_id', blockIds);
  }

  await admin.from('partner_invites').delete().in('partner_id', partnerIds);
  if (blockIds.length) {
    await admin.from('partner_seat_blocks').delete().in('id', blockIds);
  }
  await admin.from('partner_fulfillment_events').delete().in('partner_id', partnerIds);
  await admin.from('partner_members').delete().in('partner_id', partnerIds);

  if (userIds.length) {
    await admin.from('partner_members').delete().in('user_id', userIds);
    await admin.from('cohort_enrollments').delete().in('user_id', userIds);
  }
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Creates a seat block on a partner and returns its id. */
export async function createSeatBlock(params: {
  partnerId: string;
  seatsTotal: number;
  startDays?: number;
  endDays?: number;
  isActive?: boolean;
  label?: string;
}): Promise<string> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('partner_seat_blocks')
    .insert({
      partner_id: params.partnerId,
      label: params.label ?? 'test block',
      seats_total: params.seatsTotal,
      granted_tier: 'vault',
      access_starts_at: daysFromNow(params.startDays ?? -1),
      access_ends_at: daysFromNow(params.endDays ?? 30),
      source: 'sponsored',
      is_active: params.isActive ?? true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Creates a join code and returns { id, code }. */
export async function createJoinCode(params: {
  partnerId: string;
  code: string;
  seatBlockId?: string | null;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}): Promise<{ id: string; code: string }> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('partner_join_codes')
    .insert({
      partner_id: params.partnerId,
      code: params.code,
      seat_block_id: params.seatBlockId ?? null,
      max_uses: params.maxUses ?? null,
      expires_at: params.expiresAt ?? null,
      is_active: params.isActive ?? true,
    })
    .select('id, code')
    .single();
  if (error) throw error;
  return { id: data.id as string, code: data.code as string };
}

/**
 * The block's stored row. Edits must echo `access_starts_at` back EXACTLY —
 * it is immutable once a seat is granted, and a re-derived timestamp counts as
 * a change (the admin editor keeps the raw ISO string for the same reason).
 */
export async function getSeatBlock(blockId: string): Promise<{
  access_starts_at: string;
  access_ends_at: string;
  label: string;
  seats_total: number;
  source: string;
}> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('partner_seat_blocks')
    .select('access_starts_at, access_ends_at, label, seats_total, source')
    .eq('id', blockId)
    .single();
  if (error) throw error;
  return data as {
    access_starts_at: string;
    access_ends_at: string;
    label: string;
    seats_total: number;
    source: string;
  };
}

export async function auditCount(partnerId: string, action?: string): Promise<number> {
  const admin = serviceClient();
  let query = admin
    .from('partner_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId);
  if (action) query = query.eq('action', action);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
