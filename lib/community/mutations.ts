import type { SupabaseClient } from '@supabase/supabase-js';
import { EDIT_WINDOW_MS, MAX_COMMENT_LEN, MAX_POST_BODY_LEN, type Category } from './constants';
import type { Comment, LinkPreview, Post } from './types';

export type CommunityErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid'
  | 'rate_limited'
  | 'edit_window_expired';

export class CommunityError extends Error {
  constructor(public code: CommunityErrorCode, message: string) {
    super(message);
  }
}

// --- Posts ----------------------------------------------------------------

export async function createPost(
  supabase: SupabaseClient,
  input: {
    category: Category;
    body_md: string;
    link_preview: LinkPreview | null;
    partner_id: string | null;
    author_id: string;
  },
): Promise<Post> {
  if (input.body_md.trim().length === 0) {
    throw new CommunityError('invalid', 'empty body');
  }
  if (input.body_md.length > MAX_POST_BODY_LEN) {
    throw new CommunityError('invalid', 'body too long');
  }
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      partner_id: input.partner_id,
      author_id: input.author_id,
      category: input.category,
      body_md: input.body_md,
      link_preview: input.link_preview,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Post;
}

export async function updatePostBody(
  supabase: SupabaseClient,
  postId: string,
  authorId: string,
  body_md: string,
): Promise<Post> {
  if (body_md.trim().length === 0) throw new CommunityError('invalid', 'empty body');
  if (body_md.length > MAX_POST_BODY_LEN) throw new CommunityError('invalid', 'body too long');

  const { data: existing } = await supabase
    .from('community_posts')
    .select('created_at, author_id, status')
    .eq('id', postId)
    .maybeSingle();
  if (!existing) throw new CommunityError('not_found', 'post not found');
  if (existing.author_id !== authorId) throw new CommunityError('forbidden', 'not your post');
  if (existing.status !== 'published') throw new CommunityError('forbidden', 'post not editable');
  if (Date.now() - new Date(existing.created_at as string).getTime() > EDIT_WINDOW_MS) {
    throw new CommunityError('edit_window_expired', 'edit window expired');
  }

  const { data, error } = await supabase
    .from('community_posts')
    .update({ body_md, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Post;
}

export async function deletePostAsAuthor(
  supabase: SupabaseClient,
  postId: string,
): Promise<void> {
  const { error } = await supabase
    .from('community_posts')
    .update({ status: 'deleted' })
    .eq('id', postId);
  if (error) throw error;
}

// --- Comments -------------------------------------------------------------

export async function addComment(
  supabase: SupabaseClient,
  input: {
    post_id: string;
    body_md: string;
    parent_comment_id: string | null;
    author_id: string;
  },
): Promise<Comment> {
  if (input.body_md.trim().length === 0) throw new CommunityError('invalid', 'empty body');
  if (input.body_md.length > MAX_COMMENT_LEN) throw new CommunityError('invalid', 'too long');

  // Enforce single-level nesting: if parent has a parent, reparent to root.
  let parentId = input.parent_comment_id;
  if (parentId) {
    const { data: parent } = await supabase
      .from('community_comments')
      .select('parent_comment_id')
      .eq('id', parentId)
      .maybeSingle();
    if (parent?.parent_comment_id) parentId = parent.parent_comment_id as string;
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: input.post_id,
      author_id: input.author_id,
      body_md: input.body_md,
      parent_comment_id: parentId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function updateCommentBody(
  supabase: SupabaseClient,
  commentId: string,
  authorId: string,
  body_md: string,
): Promise<Comment> {
  if (body_md.trim().length === 0) throw new CommunityError('invalid', 'empty body');
  if (body_md.length > MAX_COMMENT_LEN) throw new CommunityError('invalid', 'too long');

  const { data: existing } = await supabase
    .from('community_comments')
    .select('created_at, author_id, status')
    .eq('id', commentId)
    .maybeSingle();
  if (!existing) throw new CommunityError('not_found', 'comment not found');
  if (existing.author_id !== authorId) throw new CommunityError('forbidden', 'not your comment');
  if (existing.status !== 'published') throw new CommunityError('forbidden', 'not editable');
  if (Date.now() - new Date(existing.created_at as string).getTime() > EDIT_WINDOW_MS) {
    throw new CommunityError('edit_window_expired', 'edit window expired');
  }

  const { data, error } = await supabase
    .from('community_comments')
    .update({ body_md })
    .eq('id', commentId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function deleteCommentAsAuthor(
  supabase: SupabaseClient,
  commentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('community_comments')
    .update({ status: 'deleted' })
    .eq('id', commentId);
  if (error) throw error;
}

// --- Likes ----------------------------------------------------------------

export async function likePost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('community_post_likes')
    .upsert(
      { post_id: postId, user_id: userId },
      { onConflict: 'post_id,user_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function unlikePost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('community_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throw error;
}
