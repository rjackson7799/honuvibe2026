import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { getPost, listComments } from '@/lib/community/queries';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  const post = await getPost(supabase, id);
  if (!post) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const comments = await listComments(supabase, id);
  return NextResponse.json({ post, comments });
}
