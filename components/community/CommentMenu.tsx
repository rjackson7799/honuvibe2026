'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MoreHorizontal } from 'lucide-react';
import { ReportDialog } from './ReportDialog';

export interface CommentMenuProps {
  commentId: string;
  authorId: string;
  currentUserId: string | null;
  partnerScope: string;
  withinEditWindow: boolean;
  onEdit: () => void;
}

export function CommentMenu({
  commentId,
  authorId,
  currentUserId,
  partnerScope,
  withinEditWindow,
  onEdit,
}: CommentMenuProps) {
  const t = useTranslations('community');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUserId !== null && currentUserId === authorId;

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function del() {
    if (!confirm(t('confirm_delete_comment'))) return;
    setError(null);
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(t('error_generic'));
      }
    } catch {
      setError(t('error_network'));
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-teal)] transition-colors"
        aria-label="Comment menu"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[150px] rounded-[10px] bg-bg-secondary border border-border-default shadow-[var(--shadow-lg)] py-1 text-[13px]">
          {currentUserId && !isAuthor && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setReportOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              {t('menu_report')}
            </button>
          )}
          {isAuthor && withinEditWindow && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-3 py-2 text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              {t('menu_edit')}
            </button>
          )}
          {isAuthor && (
            <button
              type="button"
              onClick={() => void del()}
              className="w-full text-left px-3 py-2 text-[color:var(--accent-coral,#dc2626)] hover:bg-bg-tertiary transition-colors"
            >
              {t('menu_delete')}
            </button>
          )}
          {error && (
            <p className="px-3 py-2 text-[12px] text-[color:var(--accent-coral,#dc2626)]">
              {error}
            </p>
          )}
        </div>
      )}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="comment"
        targetId={commentId}
        partnerScope={partnerScope}
      />
    </div>
  );
}
