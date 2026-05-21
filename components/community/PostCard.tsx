import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Heart, MessageCircle, Pin } from 'lucide-react';
import { CommunityMarkdown } from '@/lib/community/markdown';
import type { Post } from '@/lib/community/types';

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

function truncate(s: string, max = 320): { text: string; truncated: boolean } {
  if (s.length <= max) return { text: s, truncated: false };
  return { text: s.slice(0, max).replace(/\s+\S*$/, '') + '…', truncated: true };
}

export async function PostCard({ post, locale }: { post: Post; locale: string }) {
  const t = await getTranslations('community');
  const { text, truncated } = truncate(post.body_md);
  const isPinned = post.pinned_at !== null;

  return (
    <Link
      href={`/learn/dashboard/community/${post.id}`}
      className="block rounded-[14px] bg-bg-secondary border border-border-default p-5 hover:border-border-hover hover:shadow-[var(--shadow-md)] transition-all"
    >
      {isPinned && (
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-[color:var(--accent-teal)] mb-2">
          <Pin size={11} />
          {t('post_pinned_label')}
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-3">
        {post.author?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.author.avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover bg-bg-tertiary"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-bg-tertiary" />
        )}
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <span className="font-semibold text-fg-primary truncate">
            {post.author?.full_name ?? 'Member'}
          </span>
          <span className="text-fg-tertiary">·</span>
          <span className="text-fg-tertiary">{timeAgo(post.created_at, locale)}</span>
          <span className="text-fg-tertiary">·</span>
          <span className="text-fg-tertiary">{t(`category_${post.category}`)}</span>
        </div>
      </div>

      <div className="prose prose-sm max-w-none text-fg-primary [&_a]:text-[color:var(--accent-teal)] [&_p]:my-2 [&_pre]:bg-bg-tertiary [&_pre]:p-3 [&_pre]:rounded-[8px] [&_code]:text-[13px]">
        <CommunityMarkdown body={text} />
      </div>
      {truncated && (
        <p className="text-[13px] text-[color:var(--accent-teal)] font-medium mt-2">…</p>
      )}

      {post.link_preview && (
        <div className="mt-3 rounded-[10px] border border-border-default overflow-hidden flex">
          {post.link_preview.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.link_preview.image}
              alt=""
              className="w-24 h-24 object-cover bg-bg-tertiary shrink-0"
            />
          )}
          <div className="p-3 min-w-0">
            <p className="text-[12px] text-fg-tertiary truncate">{post.link_preview.site}</p>
            <p className="text-[13.5px] font-semibold text-fg-primary truncate">
              {post.link_preview.title}
            </p>
            {post.link_preview.description && (
              <p className="text-[12.5px] text-fg-secondary line-clamp-2">
                {post.link_preview.description}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-[12.5px] text-fg-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <Heart size={13} />
          {post.like_count}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle size={13} />
          {post.comment_count}
        </span>
      </div>
    </Link>
  );
}
