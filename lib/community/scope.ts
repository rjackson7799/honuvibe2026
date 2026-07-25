import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommunityScope } from './types';

/**
 * Returns the user's community scope, or null if they have no access.
 *
 * This does NOT re-implement the membership lookup in TypeScript — it calls the
 * Postgres helpers directly, so the `partner_members.status = 'active'` filter
 * added in migration 064 applies here automatically. Keep it that way: a local
 * copy of the rule would be one more thing to drift.
 */
export async function getCommunityScope(
  supabase: SupabaseClient,
): Promise<CommunityScope | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: access } = await supabase.rpc('has_community_access', { p_user_id: user.id });
  if (!access) return null;

  const { data: scopeId } = await supabase.rpc('community_scope_for', { p_user_id: user.id });
  if (!scopeId) return { partnerId: null, partner: null };

  const { data: partner } = await supabase
    .from('partners')
    .select('id, slug, name_en, primary_color, line_url')
    .eq('id', scopeId as string)
    .single();

  return { partnerId: scopeId as string, partner: partner ?? null };
}

export async function requireCommunityScope(
  supabase: SupabaseClient,
): Promise<CommunityScope> {
  const scope = await getCommunityScope(supabase);
  if (!scope) redirect('/learn/dashboard/community');
  return scope;
}
