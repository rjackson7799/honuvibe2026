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
    .select('id, slug, name_en, name_jp, primary_color, line_url')
    .eq('id', scopeId as string)
    .single();

  return { partnerId: scopeId as string, partner: partner ?? null };
}

/**
 * Just the partner id the community feed is scoped to, or null for the HonuVibe
 * main feed.
 *
 * The dashboard needs the scope id without the partner row or the access check,
 * so this is the thin path. It stays in this module for the same reason
 * `getCommunityScope` does: the rule is `community_scope_for`, not a TypeScript
 * copy of it.
 *
 * NOT interchangeable with the branding helper in lib/partners/active-partner.ts.
 * `community_scope_for` filters only `partner_members.status = 'active'`; it does
 * NOT check `partners.is_active`, and the branding helper does. Deriving feed
 * scope from branding would send a deactivated partner's members to the global
 * feed while RLS still expects partner scope — an empty tile with no explanation.
 *
 * On RPC error this logs and returns null, which is indistinguishable from
 * "global scope" at the call site. RLS prevents any leakage, so the consequence
 * is a partner member briefly seeing a global empty state instead of a load
 * error. A discriminated result would be more accurate operationally; deferred
 * deliberately, since acting on it means a new tile state and its bilingual copy.
 */
export async function getCommunityScopeId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('community_scope_for', { p_user_id: userId });
    if (error) {
      console.error('[community] getCommunityScopeId failed:', error.message);
      return null;
    }
    return (data as string | null) ?? null;
  } catch (e) {
    console.error(
      '[community] getCommunityScopeId threw:',
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

export async function requireCommunityScope(
  supabase: SupabaseClient,
): Promise<CommunityScope> {
  const scope = await getCommunityScope(supabase);
  if (!scope) redirect('/learn/dashboard/community');
  return scope;
}
