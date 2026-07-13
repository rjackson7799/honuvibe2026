import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from './constants';
import type { Comment, Post } from './types';

const POST_SELECT = `
  id, partner_id, author_id, category, body_md, link_preview,
  status, pinned_at, like_count, comment_count, created_at, updated_at,
  author:users!community_posts_author_id_fkey ( id, full_name, avatar_url )
`;

const COMMENT_SELECT = `
  id, post_id, partner_id, author_id, body_md, parent_comment_id, status, created_at,
  author:users!community_comments_author_id_fkey ( id, full_name, avatar_url )
`;

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export async function listFeed(
  supabase: SupabaseClient,
  opts: {
    partnerId: string | null;
    category?: Category;
    cursor?: string;
    limit?: number;
    userId?: string | null;
  },
): Promise<FeedPage> {
  const limit = opts.limit ?? 20;

  let q = supabase
    .from('community_posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (opts.partnerId === null) q = q.is('partner_id', null);
  else q = q.eq('partner_id', opts.partnerId);

  if (opts.category) q = q.eq('category', opts.category);
  if (opts.cursor) q = q.lt('created_at', opts.cursor);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Post[];
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit);

  if (opts.userId && posts.length > 0) {
    const { data: likes, error: likeErr } = await supabase
      .from('community_post_likes')
      .select('post_id')
      .eq('user_id', opts.userId)
      .in('post_id', posts.map((p) => p.id));
    if (likeErr) throw likeErr;
    const liked = new Set((likes ?? []).map((l) => l.post_id as string));
    posts.forEach((p) => {
      p.liked_by_me = liked.has(p.id);
    });
  }

  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;
  return { posts, nextCursor };
}

export async function getPost(
  supabase: SupabaseClient,
  id: string,
): Promise<Post | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(POST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Post) ?? null;
}

export async function listComments(
  supabase: SupabaseClient,
  postId: string,
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('community_comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}
