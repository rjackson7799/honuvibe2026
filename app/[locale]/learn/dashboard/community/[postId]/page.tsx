import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft, MessageCircle, Pin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { getPost, listComments } from '@/lib/community/queries';
import { CommunityMarkdown } from '@/lib/community/markdown';
import { canModeratePartner } from '@/lib/community/moderation';
import { EDIT_WINDOW_MS } from '@/lib/community/constants';
import { CommunityPaywall } from '@/components/community/CommunityPaywall';
import { CommentItem } from '@/components/community/CommentItem';
import { LikeButton } from '@/components/community/LikeButton';
import { CommentComposer } from '@/components/community/CommentComposer';
import { PostMenu } from '@/components/community/PostMenu';
import { PostEditor } from '@/components/community/PostEditor';

type Props = {
  params: Promise<{ locale: string; postId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

function timeAgo(iso: string, locale: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return locale === 'ja' ? '今' : 'now';
  if (min < 60) return locale === 'ja' ? `${min}分前` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === 'ja' ? `${hr}時間前` : `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return locale === 'ja' ? `${d}日前` : `${d}d`;
  const mo = Math.floor(d / 30);
  return locale === 'ja' ? `${mo}ヶ月前` : `${mo}mo`;
}

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { locale, postId } = await params;
  const { edit } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const scope = await getCommunityScope(supabase);
  if (!scope) {
    return <CommunityPaywall />;
  }

  const post = await getPost(supabase, postId);
  if (!post) notFound();

  const comments = await listComments(supabase, postId);
  const t = await getTranslations('community');

  // Did the current user like this post?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  let likedByMe = false;
  if (userId) {
    const { data: likeRow } = await supabase
      .from('community_post_likes')
      .select('user_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    likedByMe = !!likeRow;
  }

  // Banned in this scope? (Hide comment composer.)
  let isBanned = false;
  if (userId) {
    const { data: banRow } = await supabase
      .from('community_bans')
      .select('user_id')
      .eq('user_id', userId)
      .is('partner_id', scope.partnerId)
      .maybeSingle();
    isBanned = !!banRow;
  }

  const partnerScope = scope.partner?.slug ?? 'main';
  const isModerator = await canModeratePartner(supabase, post.partner_id);
  const withinEditWindow =
    Date.now() - new Date(post.created_at).getTime() < EDIT_WINDOW_MS;
  const editing =
    edit === '1' &&
    userId === post.author_id &&
    withinEditWindow &&
    post.status === 'published';

  // Group comments: top-level + their direct replies (one level deep only)
  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = new Map<string, typeof comments>();
  for (const c of comments) {
    if (c.parent_comment_id) {
      const list = repliesByParent.get(c.parent_comment_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_comment_id, list);
    }
  }

  return (
    <div className="space-y-5 max-w-[820px]">
      <Link
        href="/learn/dashboard/community"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={14} />
        {t('back_to_feed')}
      </Link>

      <article className="rounded-[14px] bg-bg-secondary border border-border-default p-6">
        {post.pinned_at && (
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-[color:var(--accent-teal)] mb-3">
            <Pin size={11} />
            {t('post_pinned_label')}
          </div>
        )}

        <div className="flex items-start gap-3 mb-4">
          {post.author?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover bg-bg-tertiary"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-bg-tertiary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg-primary text-[14.5px] truncate">
              {post.author?.full_name ?? 'Member'}
            </p>
            <p className="text-[12.5px] text-fg-tertiary">
              {timeAgo(post.created_at, locale)} · {t(`category_${post.category}`)}
              {post.updated_at !== post.created_at && (
                <> · {t('post_edited_label')}</>
              )}
            </p>
          </div>
          {userId && (
            <PostMenu
              postId={post.id}
              authorId={post.author_id}
              currentUserId={userId}
              isModerator={isModerator}
              partnerScope={partnerScope}
              partnerIdForApi={post.partner_id}
              authorIdForBan={post.author_id}
              isPinned={!!post.pinned_at}
              status={post.status}
              withinEditWindow={withinEditWindow}
            />
          )}
        </div>

        {editing ? (
          <PostEditor postId={post.id} initialBody={post.body_md} />
        ) : (
          <div className="prose max-w-none text-fg-primary [&_a]:text-[color:var(--accent-teal)] [&_pre]:bg-bg-tertiary [&_pre]:p-3 [&_pre]:rounded-[8px]">
            <CommunityMarkdown body={post.body_md} />
          </div>
        )}

        {post.link_preview && (
          <a
            href={post.link_preview.url}
            target="_blank"
            rel="noopener nofollow ugc"
            className="mt-4 block rounded-[10px] border border-border-default overflow-hidden hover:border-border-hover transition-colors"
          >
            <div className="flex">
              {post.link_preview.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.link_preview.image}
                  alt=""
                  className="w-28 h-28 object-cover bg-bg-tertiary shrink-0"
                />
              )}
              <div className="p-3 min-w-0">
                <p className="text-[12px] text-fg-tertiary truncate">
                  {post.link_preview.site}
                </p>
                <p className="text-[14px] font-semibold text-fg-primary truncate">
                  {post.link_preview.title}
                </p>
                {post.link_preview.description && (
                  <p className="text-[12.5px] text-fg-secondary line-clamp-2">
                    {post.link_preview.description}
                  </p>
                )}
              </div>
            </div>
          </a>
        )}

        <div className="flex items-center gap-5 mt-5 pt-4 border-t border-border-default text-[13px] text-fg-tertiary">
          <LikeButton
            postId={post.id}
            initialLiked={likedByMe}
            initialCount={post.like_count}
            partnerScope={partnerScope}
          />
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle size={14} />
            {post.comment_count}
          </span>
        </div>
      </article>

      {!isBanned && userId && (
        <div className="rounded-[14px] bg-bg-secondary border border-border-default p-4">
          <CommentComposer postId={post.id} partnerScope={partnerScope} />
        </div>
      )}

      <section>
        <h2 className="text-[15px] font-bold text-fg-primary uppercase tracking-[0.1em] mb-3">
          {t('comments_heading')}
        </h2>
        {topLevel.length === 0 ? (
          <p className="text-sm text-fg-tertiary py-6 text-center">—</p>
        ) : (
          <div className="space-y-1 rounded-[14px] bg-bg-secondary border border-border-default p-4 divide-y divide-border-default">
            {topLevel.map((c) => (
              <div key={c.id}>
                <CommentItem
                  comment={c}
                  locale={locale}
                  createdLabel={timeAgo(c.created_at, locale)}
                  currentUserId={userId}
                  partnerScope={partnerScope}
                  canComment={!isBanned && !!userId}
                />
                {(repliesByParent.get(c.id) ?? []).map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    locale={locale}
                    isReply
                    createdLabel={timeAgo(reply.created_at, locale)}
                    currentUserId={userId}
                    partnerScope={partnerScope}
                    canComment={!isBanned && !!userId}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
