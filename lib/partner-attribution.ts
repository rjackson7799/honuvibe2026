import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const PARTNER_COOKIE_NAME = 'hv_partner';

export async function getAttributedPartnerSlug(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(PARTNER_COOKIE_NAME)?.value;
  return raw ? decodeURIComponent(raw) : null;
}

export async function resolvePartnerIdBySlug(
  supabase: SupabaseClient,
  slug: string | null | undefined,
): Promise<string | null> {
  if (!slug) return null;

  const { data, error } = await supabase
    .from('partners')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[partner-attribution] resolvePartnerIdBySlug failed', { slug, error });
    return null;
  }

  return data?.id ?? null;
}
