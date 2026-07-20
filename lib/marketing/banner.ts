import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';

/**
 * Site-wide announcement banner setting (table: site_settings, migration 063).
 *
 * Read on every marketing page via MarketingNav, so it must not opt routes into
 * per-request dynamic rendering. Following the same idiom as
 * getCachedVaultTotalCount (lib/vault/queries.ts): a cookie-less anon client
 * behind unstable_cache. The cookie-bound createClient() would force dynamic
 * rendering; this stays statically prerenderable.
 *
 * Time-based revalidation (like getCachedVaultTotalCount): admin writes call
 * revalidatePath('/', 'layout') to re-render marketing routes, and this short
 * window bounds how long the cached value itself can lag a toggle.
 */
export type BannerSetting = {
  enabled: boolean;
  slug: string | null;
};

export const getCachedBannerSetting = unstable_cache(
  async (): Promise<BannerSetting> => {
    try {
      const supabase = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );
      const { data, error } = await supabase
        .from('site_settings')
        .select('banner_enabled, banner_event_slug')
        .eq('id', true)
        .maybeSingle();

      if (error) {
        console.error('getCachedBannerSetting error:', error);
        return { enabled: false, slug: null };
      }
      return {
        enabled: data?.banner_enabled ?? false,
        slug: data?.banner_event_slug ?? null,
      };
    } catch (error) {
      console.error('getCachedBannerSetting error:', error);
      return { enabled: false, slug: null };
    }
  },
  ['homepage-banner-setting'],
  { revalidate: 30 },
);
