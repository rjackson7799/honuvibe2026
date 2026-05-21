import { createClient } from '@/lib/supabase/server';
import type { SubscriptionTier } from '@/lib/stripe/tiers';

export function parseTier(value: unknown): SubscriptionTier | null {
  return value === 'community' || value === 'vault' ? value : null;
}

/** Fetch the user fields needed for access checks + checkout. Single source of truth. */
export async function fetchUserAccessRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from('users')
    .select(
      'stripe_customer_id, subscription_tier, subscription_status, subscription_expires_at, email, full_name, role',
    )
    .eq('id', userId)
    .single();
  return data;
}
