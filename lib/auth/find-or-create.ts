/**
 * Find an existing HonuVibe user by email, or create a new one.
 *
 * Used by guest-checkout webhook handlers — the user paid before they had a
 * HonuVibe account, so we create the account server-side based on the email
 * they used at Stripe Checkout. Email is treated as verified (they completed
 * Stripe Checkout, which already verified payment-method email).
 *
 * Returns the public.users row. Caller is responsible for any tier/access
 * mutations on the returned user.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FoundOrCreatedUser {
  id: string;
  email: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  subscription_tier: 'free' | 'community' | 'vault';
  subscription_status: string | null;
  subscription_stripe_id: string | null;
  subscription_expires_at: string | null;
  is_vertice_member: boolean | null;
  locale_preference: 'en' | 'ja';
}

const USER_FIELDS =
  'id, email, full_name, stripe_customer_id, subscription_tier, subscription_status, subscription_stripe_id, subscription_expires_at, is_vertice_member, locale_preference';

export async function findOrCreateUserByEmail(
  supabase: SupabaseClient,
  email: string,
  name?: string | null,
  locale: 'en' | 'ja' = 'en',
): Promise<FoundOrCreatedUser> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Try to find existing user by email.
  const { data: existing, error: findError } = await supabase
    .from('users')
    .select(USER_FIELDS)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (findError) {
    throw new Error(
      `[findOrCreateUserByEmail] Lookup failed: ${findError.message}`,
    );
  }

  if (existing) {
    return existing as FoundOrCreatedUser;
  }

  // 2. Create auth user via Supabase admin API. The handle_new_user trigger
  //    (migration 001) inserts the matching public.users row automatically.
  //    email_confirm: true — they verified email through Stripe payment flow.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: {
      full_name: name ?? '',
    },
  });

  if (createError || !created.user) {
    throw new Error(
      `[findOrCreateUserByEmail] auth.admin.createUser failed: ${createError?.message ?? 'no user returned'}`,
    );
  }

  // 3. Set locale preference on the newly-inserted public.users row.
  //    Trigger doesn't set this — it defaults to 'en'.
  if (locale !== 'en') {
    await supabase
      .from('users')
      .update({ locale_preference: locale })
      .eq('id', created.user.id);
  }

  // 4. Re-fetch the row with all fields populated.
  const { data: fresh, error: fetchError } = await supabase
    .from('users')
    .select(USER_FIELDS)
    .eq('id', created.user.id)
    .single();

  if (fetchError || !fresh) {
    throw new Error(
      `[findOrCreateUserByEmail] Post-create fetch failed: ${fetchError?.message ?? 'no row'}`,
    );
  }

  return fresh as FoundOrCreatedUser;
}
