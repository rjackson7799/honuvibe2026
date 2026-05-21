import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Checks whether the current user can moderate content in the given partner scope.
 * - HonuVibe admins (is_admin RPC) → all scopes
 * - Partner admins (is_partner_for RPC) → only their partner
 * - HonuVibe-main (partnerId === null) → admins only (no partner-admin path)
 */
export async function canModeratePartner(
  supabase: SupabaseClient,
  partnerId: string | null,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin === true) return true;

  if (partnerId === null) return false;
  const { data: isPartnerAdmin } = await supabase.rpc('is_partner_for', {
    p_partner_id: partnerId,
  });
  return isPartnerAdmin === true;
}

const URL_RE = /https?:\/\/\S+/g;

/**
 * Soft spam detector. Returns true if the body should be auto-flagged to the
 * moderation queue. Keep conservative — auto_flag posts are still visible.
 */
export function shouldAutoFlag(body: string): boolean {
  const urls = body.match(URL_RE) ?? [];
  if (urls.length >= 5) return true;
  return false;
}
