import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  hasActiveSubscription,
  hasVaultAccess,
  type CohortEnrollmentRow,
  type SeatGrantRow,
} from '@/lib/access/checks';

/** Sponsor shown on the billing page when Vault comes from a partner seat. */
export interface VaultSeatSponsor {
  partnerSlug: string;
  nameEn: string;
  nameJp: string | null;
  accessEndsAt: string;
}

export interface VaultAccessResult {
  hasAccess: boolean;
  source: 'subscription' | 'cohort' | 'seat' | 'enrollment' | null;
  subscriptionStatus: string | null;
  activeCourseName: string | null;
  /** Non-null only when `source === 'seat'`. */
  sponsor: VaultSeatSponsor | null;
}

type SeatGrantRpcRow = {
  partner_id: string;
  partner_slug: string;
  partner_name_en: string;
  partner_name_jp: string | null;
  granted_tier: string;
  access_starts_at: string;
  access_ends_at: string;
};

/**
 * The signed-in user's ACTIVE sponsored seats.
 *
 * Goes through the `get_my_active_seat_grants()` RPC rather than an
 * authenticated-client join: `partner_seat_blocks` is not member-readable under
 * RLS, so a client-side join would silently drop the block's window/active
 * fields and deny access that SQL grants. The RPC derives `auth.uid()` itself
 * and does the "active" filtering (unrevoked grant, active block, inside the
 * window) server-side.
 */
export async function getMyActiveSeatGrants(
  supabase: SupabaseClient,
): Promise<SeatGrantRpcRow[]> {
  const { data, error } = await supabase.rpc('get_my_active_seat_grants');
  if (error) {
    console.error('[vault/access] get_my_active_seat_grants failed:', error.message);
    return [];
  }
  return (data ?? []) as SeatGrantRpcRow[];
}

/**
 * Check whether the user can view Vault content.
 *
 * Access sources, in priority order:
 *   1. Active subscription_tier = 'vault' (includes trialing + cancelled-grace).
 *   2. Active cohort enrollment (bundle window covers now).
 *   3. Sponsored partner seat (block window covers now).
 *   4. Active enrollment in any course (legacy course-bundled Vault access).
 *
 * `userId` must be the SIGNED-IN user: the seat lookup runs through an RPC that
 * derives `auth.uid()` server-side, so seats are only consulted when the id
 * matches the session (checked below — a mismatch degrades to "no seats", never
 * to another user's seats).
 */
export async function checkVaultAccess(userId: string): Promise<VaultAccessResult> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('role, subscription_status, subscription_tier, subscription_expires_at')
    .eq('id', userId)
    .single();

  // 1. Subscription path.
  if (user && user.subscription_tier === 'vault' && hasActiveSubscription(user)) {
    return {
      hasAccess: true,
      source: 'subscription',
      subscriptionStatus: user.subscription_status,
      activeCourseName: null,
      sponsor: null,
    };
  }

  // Admin bypass.
  if (user?.role === 'admin') {
    return {
      hasAccess: true,
      source: 'subscription',
      subscriptionStatus: user.subscription_status,
      activeCourseName: null,
      sponsor: null,
    };
  }

  // 2. Cohort path — fetch active cohort enrollments for this user.
  const { data: cohortRows } = await supabase
    .from('cohort_enrollments')
    .select('bundle_access_starts_at, bundle_access_ends_at')
    .eq('user_id', userId);

  if (
    user &&
    hasVaultAccess(user, (cohortRows ?? []) as CohortEnrollmentRow[])
  ) {
    return {
      hasAccess: true,
      source: 'cohort',
      subscriptionStatus: user.subscription_status,
      activeCourseName: null,
      sponsor: null,
    };
  }

  // 3. Sponsored-seat path.
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  if (sessionUser?.id === userId) {
    const seatRows = await getMyActiveSeatGrants(supabase);
    // The RPC already filtered to unrevoked grants on active, in-window blocks,
    // so these two fields are constants — kept explicit so the pure function
    // sees the same shape the parity matrix tests.
    const seatGrants: SeatGrantRow[] = seatRows.map((r) => ({
      access_starts_at: r.access_starts_at,
      access_ends_at: r.access_ends_at,
      revoked_at: null,
      block_is_active: true,
    }));

    if (user && hasVaultAccess(user, [], seatGrants)) {
      const first = seatRows[0];
      return {
        hasAccess: true,
        source: 'seat',
        subscriptionStatus: user.subscription_status,
        activeCourseName: null,
        sponsor: first
          ? {
              partnerSlug: first.partner_slug,
              nameEn: first.partner_name_en,
              nameJp: first.partner_name_jp,
              accessEndsAt: first.access_ends_at,
            }
          : null,
      };
    }
  }

  // 4. Legacy course-enrollment path — any live enrollment grants Vault access.
  // 'completed' still counts: finishing a course must not revoke the Vault
  // access the purchase granted.
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, course:courses(title_en)')
    .eq('user_id', userId)
    .in('status', ['active', 'completed'])
    .limit(1)
    .maybeSingle();

  if (enrollment) {
    const course = enrollment.course as unknown as { title_en: string } | null;
    return {
      hasAccess: true,
      source: 'enrollment',
      subscriptionStatus: user?.subscription_status ?? 'none',
      activeCourseName: course?.title_en ?? null,
      sponsor: null,
    };
  }

  return {
    hasAccess: false,
    source: null,
    subscriptionStatus: user?.subscription_status ?? 'none',
    activeCourseName: null,
    sponsor: null,
  };
}

/**
 * Resolve the current user from the request and return whether they have
 * Vault-tier access. Convenience wrapper around checkVaultAccess for callers
 * that only need a boolean (API routes, server actions guarding premium
 * payloads).
 *
 * Returns `{ hasAccess: false, userId: null }` for unauthenticated requests.
 */
export async function requireVaultAccess(): Promise<{
  hasAccess: boolean;
  userId: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { hasAccess: false, userId: null };
  }

  const result = await checkVaultAccess(user.id);
  return { hasAccess: result.hasAccess, userId: user.id };
}
