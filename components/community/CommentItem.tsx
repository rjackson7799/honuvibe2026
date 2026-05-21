import { CommunityMarkdown } from '@/lib/community/markdown';
import type { Comment } from '@/lib/community/types';

function timeAgo(iso: string, locale: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return locale === 'ja' ? '今' : 'now';
  if (min < 60) return locale === 'ja' ? `${min}分前` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === 'ja' ? `${hr}時間前` : `${hr}h`;
  const d = Math.floor(hr / 24);
  return locale === 'ja' ? `${d}日前` : `${d}d`;
}

export function CommentItem({
  comment,
  locale,
  isReply = false,
}: {
  comment: Comment;
  locale: string;
  isReply?: boolean;
}) {
  return (
    <div className={isReply ? 'pl-8 border-l border-border-default ml-3' : ''}>
      <div className="flex items-start gap-2.5 py-3">
        {comment.author?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.author.avatar_url}
            alt=""
            className="w-7 h-7 rounded-full object-cover bg-bg-tertiary shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-bg-tertiary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[12.5px]">
            <span className="font-semibold text-fg-primary">
              {comment.author?.full_name ?? 'Member'}
            </span>
            <span className="text-fg-tertiary">·</span>
            <span className="text-fg-tertiary">{timeAgo(comment.created_at, locale)}</span>
          </div>
          <div className="prose prose-sm max-w-none text-fg-primary text-[14px] mt-1 [&_p]:my-1 [&_a]:text-[color:var(--accent-teal)]">
            <CommunityMarkdown body={comment.body_md} />
          </div>
        </div>
      </div>
    </div>
  );
}
