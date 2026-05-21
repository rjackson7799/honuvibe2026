'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MAX_COMMENT_LEN } from '@/lib/community/constants';
import { trackCommunityCommentCreated } from '@/lib/analytics';

export function CommentComposer({
  postId,
  parentCommentId = null,
  partnerScope,
  onSubmitted,
}: {
  postId: string;
  parentCommentId?: string | null;
  partnerScope: string;
  onSubmitted?: () => void;
}) {
  const t = useTranslations('community');
  const router = useRouter();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (body.trim().length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_md: body, parent_comment_id: parentCommentId }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? 'error');
        setSubmitting(false);
        return;
      }
      trackCommunityCommentCreated({ partner_scope: partnerScope, post_id: postId });
      setBody('');
      router.refresh();
      onSubmitted?.();
    } catch {
      setError('network');
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('comment_placeholder')}
        maxLength={MAX_COMMENT_LEN}
        className="w-full resize-y min-h-[72px] p-3 rounded-[10px] bg-bg-primary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-teal)] text-[14px] leading-relaxed"
      />
      {error && (
        <p className="text-[12px] text-[color:var(--accent-coral,#dc2626)]">{error}</p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={body.trim().length === 0 || submitting}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? '…' : t('composer_submit')}
        </button>
      </div>
    </div>
  );
}
