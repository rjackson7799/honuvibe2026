import { NextResponse, after } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { CommunityError, addComment } from '@/lib/community/mutations';
import { emitNotification } from '@/lib/notifications/emit';

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
    // Notify the post author of the reply (best-effort, after the response).
    after(() => notifyPostAuthorOfReply(id, user.id, comment.id));
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}

/**
 * Emit a community_reply notification to the post author (skips self-replies).
 * Runs post-response via the service role — reliable on Fluid Compute and
 * independent of the request-scoped client. Never throws.
 */
async function notifyPostAuthorOfReply(
  postId: string,
  replierId: string,
  commentId: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: post } = await admin
      .from('community_posts')
      .select('author_id, body_md')
      .eq('id', postId)
      .maybeSingle();
    if (!post || post.author_id === replierId) return;

    const { data: actor } = await admin
      .from('users')
      .select('full_name')
      .eq('id', replierId)
      .maybeSingle();

    await emitNotification({
      userId: post.author_id as string,
      type: 'community_reply',
      entityId: commentId,
      data: {
        actorName: (actor?.full_name as string) || 'Someone',
        postExcerpt: String(post.body_md ?? '').slice(0, 80),
      },
      href: `/learn/dashboard/community/${postId}`,
    });
  } catch (err) {
    console.error('[notifications] community reply notify failed:', err);
  }
}
