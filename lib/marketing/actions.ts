'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { publicEventBySlug } from '@/lib/events/public-events';

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Not authorized');
}

/** Re-render every marketing route so the strip picks up the new setting. */
function revalidateBanner(): void {
  // The strip renders on every marketing page (statically prerendered), so
  // invalidate the whole root-layout tree. The cached read (lib/marketing/
  // banner.ts) has a short revalidate window bounding any remaining lag.
  revalidatePath('/', 'layout');
}

async function updateSiteSettings(
  patch: { banner_enabled?: boolean; banner_event_slug?: string | null },
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('site_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (error) throw new Error(error.message);
  revalidateBanner();
}

/** Turn the site-wide announcement banner on or off. */
export async function setBannerEnabled(enabled: boolean): Promise<void> {
  await updateSiteSettings({ banner_enabled: enabled });
}

/**
 * Choose which public event the banner features. Pass null to clear. The slug
 * must match a hand-authored event in lib/events/public-events.ts; unknown
 * slugs are rejected so the strip always resolves real content.
 */
export async function setBannerEvent(slug: string | null): Promise<void> {
  if (slug !== null && !publicEventBySlug(slug)) {
    throw new Error(`Unknown public event slug: ${slug}`);
  }
  await updateSiteSettings({ banner_event_slug: slug });
}
