'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CommunityMarkdown } from '@/lib/community/markdown';
import { EDIT_WINDOW_MS, MAX_COMMENT_LEN } from '@/lib/community/constants';
import type { Comment } from '@/lib/community/types';
import { CommentComposer } from './CommentComposer';
import { CommentMenu } from './CommentMenu';

export function CommentItem({
  comment,
  isReply = false,
  createdLabel,
  currentUserId,
  partnerScope,
  canComment,
}: {
  comment: Comment;
  locale: string;
  isReply?: boolean;
  createdLabel: string;
  currentUserId: string | null;
  partnerScope: string;
  canComment: boolean;
}) {
  const t = useTranslations('community');
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body_md);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withinEditWindow =
    Date.now() - new Date(comment.created_at).getTime() < EDIT_WINDOW_MS;

  async function save() {
    if (draft.trim().length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_md: draft }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          json.error === 'edit_window_expired' ? t('error_edit_window') : t('error_generic'),
        );
        setBusy(false);
        return;
      }
      setEditing(false);
      setBusy(false);
      router.refresh();
    } catch {
      setError(t('error_network'));
      setBusy(false);
    }
  }

  function cancel() {
    setDraft(comment.body_md);
    setError(null);
    setEditing(false);
  }

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
            <span className="text-fg-tertiary">{createdLabel}</span>
            {currentUserId && (
              <span className="ml-auto">
                <CommentMenu
                  commentId={comment.id}
                  authorId={comment.author_id}
                  currentUserId={currentUserId}
                  partnerScope={partnerScope}
                  withinEditWindow={withinEditWindow}
                  onEdit={() => setEditing(true)}
                />
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_COMMENT_LEN}
                rows={3}
                className="w-full resize-y min-h-[72px] p-3 rounded-[10px] bg-bg-primary border border-border-default text-fg-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-teal)] text-[14px] leading-relaxed"
              />
              {error && (
                <p className="text-[12px] text-[color:var(--accent-coral,#dc2626)]">{error}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full text-[12.5px] font-semibold bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-teal)] transition-colors"
                >
                  {t('edit_cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy || draft.trim().length === 0}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full text-[12.5px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-teal)] transition-colors"
                >
                  {busy ? '…' : t('edit_save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-fg-primary text-[14px] mt-1 [&_p]:my-1 [&_a]:text-[color:var(--accent-teal)]">
              <CommunityMarkdown body={comment.body_md} />
            </div>
          )}

          {!isReply && canComment && !editing && (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="mt-1 inline-flex items-center min-h-[44px] text-[12.5px] font-medium text-fg-tertiary hover:text-fg-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-teal)] transition-colors"
            >
              {t('comment_reply')}
            </button>
          )}

          {replyOpen && (
            <div className="mt-2">
              <CommentComposer
                postId={comment.post_id}
                parentCommentId={comment.id}
                partnerScope={partnerScope}
                onSubmitted={() => setReplyOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
