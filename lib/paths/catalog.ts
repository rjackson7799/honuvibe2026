import { createAdminClient } from '@/lib/supabase/server';
import type { CatalogItem } from './types';

export async function buildCatalog(
  language: string,
  userTier: 'free' | 'premium',
): Promise<CatalogItem[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('content_items')
    .select(
      'id, title_en, title_jp, content_type, difficulty_level, tags, duration_minutes, description_en, description_jp, source, access_tier',
    )
    .eq('is_published', true);

  if (userTier === 'free') {
    query = query.eq('access_tier', 'free');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to build content catalog: ${error.message}`);
  }

  if (!data) return [];

  return data.map((item) => ({
    id: item.id,
    title:
      language === 'ja' && item.title_jp ? item.title_jp : item.title_en,
    type: item.content_type,
    difficulty: item.difficulty_level ?? 'beginner',
    tags: (item.tags as string[]) ?? [],
    duration_minutes: item.duration_minutes,
    description: (
      (language === 'ja' && item.description_jp
        ? item.description_jp
        : item.description_en) ?? ''
    ).substring(0, 150),
    source: item.source ?? '',
    tier: item.access_tier ?? 'free',
  }));
}
