import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { TRACK_IDS, type TrackId } from '@/lib/tracks';
import type {
  VaultAccessTier,
  VaultContentType,
  VaultDifficulty,
  VaultLanguage,
} from '@/lib/vault/types';

/** Cache tag for the public catalog; the Vault admin actions revalidate it. */
export const VAULT_CATALOG_TAG = 'vault-catalog';

/**
 * Public, browse-safe shape of a Vault item. Deliberately omits `url` and
 * `embed_url`: for premium items those can be the content itself, and anon
 * can already read them through PostgREST (pre-existing gap, tracked as its
 * own fix). This query must never widen that.
 */
export type PublicCatalogItem = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  content_type: VaultContentType;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  difficulty_level: VaultDifficulty | null;
  language: VaultLanguage;
  access_tier: VaultAccessTier;
  track: TrackId | null;
  is_featured: boolean;
  publish_date: string | null;
  series_id: string | null;
  series_order: number | null;
};

/** Stable sort into TRACK_IDS order (not alphabetical), untracked last. */
export function sortByTrack<T extends { track: TrackId | null }>(items: T[]): T[] {
  const rank = (t: TrackId | null) => (t === null ? TRACK_IDS.length : TRACK_IDS.indexOf(t));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank(a.item.track) - rank(b.item.track) || a.i - b.i)
    .map(({ item }) => item);
}

export const PUBLIC_CATALOG_COLUMNS =
  'id, slug, title_en, title_jp, description_en, description_jp, content_type, ' +
  'thumbnail_url, duration_minutes, difficulty_level, language, access_tier, ' +
  'track, is_featured, publish_date, series_id, series_order';

/**
 * Every published, HonuVibe-owned Vault item (partner-owned items are
 * unlisted), for client-side filtering on the Learn catalog. Cookie-less anon
 * client so the result is cacheable and only ever sees what RLS gives anon.
 * Ordered by track in TRACK_IDS (product) order with untracked items last,
 * then featured, then newest.
 */
export const getPublicCatalog = unstable_cache(
  async (): Promise<PublicCatalogItem[]> => {
    try {
      const supabase = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );
      const { data, error } = await supabase
        .from('content_items')
        .select(PUBLIC_CATALOG_COLUMNS)
        .eq('is_published', true)
        .is('partner_id', null)
        .order('is_featured', { ascending: false })
        .order('publish_date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('getPublicCatalog error:', error);
        return [];
      }
      return sortByTrack((data ?? []) as unknown as PublicCatalogItem[]);
    } catch (error) {
      console.error('getPublicCatalog error:', error);
      return [];
    }
  },
  ['vault-public-catalog'],
  { revalidate: 600, tags: [VAULT_CATALOG_TAG] },
);
