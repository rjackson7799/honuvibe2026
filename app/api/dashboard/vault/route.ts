import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import type { ContentItemForStudent } from '@/lib/dashboard/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vaultAccess = await checkVaultAccess(user.id);

  // Fetch premium content items
  const { data: rawItems } = await supabase
    .from('content_items')
    .select('*')
    .eq('is_published', true)
    .eq('access_tier', 'premium')
    .order('created_at', { ascending: false });

  const items: ContentItemForStudent[] = (rawItems ?? []).map((item) => ({
    id: item.id,
    title_en: item.title_en,
    title_jp: item.title_jp,
    description_en: item.description_en,
    description_jp: item.description_jp,
    content_type: item.content_type,
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    duration_minutes: item.duration_minutes,
    difficulty_level: item.difficulty_level,
    language: item.language,
    tags: item.tags ?? [],
    access_tier: item.access_tier,
    source: item.source,
  }));

  return NextResponse.json({
    hasAccess: vaultAccess.hasAccess,
    source: vaultAccess.source,
    items,
  });
}
