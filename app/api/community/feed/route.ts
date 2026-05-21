import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { listFeed } from '@/lib/community/queries';
import { CATEGORIES, type Category } from '@/lib/community/constants';

export async function GET(req: Request) {
  const supabase = await createClient();
  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const categoryParam = url.searchParams.get('category');
  const category =
    categoryParam && (CATEGORIES as readonly string[]).includes(categoryParam)
      ? (categoryParam as Category)
      : undefined;

  const page = await listFeed(supabase, {
    partnerId: scope.partnerId,
    category,
    cursor,
  });
  return NextResponse.json(page);
}
