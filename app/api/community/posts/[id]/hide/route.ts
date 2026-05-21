import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canModeratePartner } from '@/lib/community/moderation';
import {
  deletePostAsMod,
  hidePost,
  logModAction,
  unhidePost,
} from '@/lib/community/mutations';

type Op = 'hide' | 'unhide' | 'delete';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: post } = await supabase
    .from('community_posts')
    .select('id, partner_id, status')
    .eq('id', id)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (!(await canModeratePartner(supabase, post.partner_id as string | null))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { op?: unknown } | null;
  const op: Op = body?.op === 'unhide' ? 'unhide' : body?.op === 'delete' ? 'delete' : 'hide';

  if (op === 'hide') await hidePost(supabase, id);
  else if (op === 'unhide') await unhidePost(supabase, id);
  else await deletePostAsMod(supabase, id);

  await logModAction(supabase, {
    actor_id: user.id,
    action: op,
    target_type: 'post',
    target_id: id,
    partner_id: post.partner_id as string | null,
  });
  return NextResponse.json({ ok: true });
}
