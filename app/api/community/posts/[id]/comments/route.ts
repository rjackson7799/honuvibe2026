import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { CommunityError, addComment } from '@/lib/community/mutations';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  const body = (await req.json().catch(() => null)) as
    | { body_md?: unknown; parent_comment_id?: unknown }
    | null;
  if (!body || typeof body.body_md !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const parentId =
    typeof body.parent_comment_id === 'string' ? body.parent_comment_id : null;

  try {
    const comment = await addComment(supabase, {
      post_id: id,
      author_id: user.id,
      body_md: body.body_md,
      parent_comment_id: parentId,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}
