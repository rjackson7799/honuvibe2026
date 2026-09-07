import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';

export const getBusinessUpgradesEnabled = unstable_cache(
  async (): Promise<boolean> => {
    try {
      const client = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );
      const { data, error } = await client
        .from('site_settings')
        .select('business_upgrades_enabled')
        .eq('id', true)
        .maybeSingle();
      if (error) {
        console.error('[business-upgrades] availability read failed:', error.message);
        return false;
      }
      return data?.business_upgrades_enabled === true;
    } catch (error) {
      console.error('[business-upgrades] availability read failed:', error);
      return false;
    }
  },
  ['business-upgrades-enabled'],
  { revalidate: 30 },
);
