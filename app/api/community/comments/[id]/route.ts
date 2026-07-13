import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  CommunityError,
  deleteCommentAsAuthor,
  updateCommentBody,
} from '@/lib/community/mutations';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { body_md?: unknown } | null;
  if (!body || typeof body.body_md !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  try {
    const comment = await updateCommentBody(supabase, id, user.id, body.body_md);
    return NextResponse.json({ comment });
  } catch (err) {
    if (err instanceof CommunityError) {
      const status =
        err.code === 'not_found' ? 404
        : err.code === 'forbidden' || err.code === 'edit_window_expired' ? 403
        : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // App-side authorship gate: authors have no DELETE RLS policy, so the physical
  // delete runs via the service-role client. This is the authorization check.
  const { data: existing, error: fetchErr } = await supabase
    .from('community_comments')
    .select('author_id')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.author_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    await deleteCommentAsAuthor(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CommunityError) {
      const status = err.code === 'not_found' ? 404 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    throw err;
  }
}
