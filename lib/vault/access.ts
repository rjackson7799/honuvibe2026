import { createClient } from '@/lib/supabase/server';
import {
  hasActiveSubscription,
  hasVaultAccess,
  type CohortEnrollmentRow,
} from '@/lib/access/checks';

export interface VaultAccessResult {
  hasAccess: boolean;
  source: 'subscription' | 'cohort' | 'enrollment' | null;
  subscriptionStatus: string | null;
  activeCourseName: string | null;
}

/**
 * Check whether the user can view Vault content.
 *
 * Access sources, in priority order:
 *   1. Active subscription_tier = 'vault' (includes trialing + cancelled-grace).
 *   2. Active cohort enrollment (bundle window covers now).
 *   3. Active enrollment in any course (legacy course-bundled Vault access).
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
    };
  }

  // Admin bypass.
  if (user?.role === 'admin') {
    return {
      hasAccess: true,
      source: 'subscription',
      subscriptionStatus: user.subscription_status,
      activeCourseName: null,
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
    };
  }

  // 3. Legacy course-enrollment path — any live enrollment grants Vault access.
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
    };
  }

  return {
    hasAccess: false,
    source: null,
    subscriptionStatus: user?.subscription_status ?? 'none',
    activeCourseName: null,
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
