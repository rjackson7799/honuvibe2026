import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { likePost, unlikePost } from '@/lib/community/mutations';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  await likePost(supabase, id, user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await unlikePost(supabase, id, user.id);
  return NextResponse.json({ ok: true });
}
