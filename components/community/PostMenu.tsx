'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MoreHorizontal } from 'lucide-react';
import { ReportDialog } from './ReportDialog';

export interface PostMenuProps {
  postId: string;
  authorId: string;
  currentUserId: string | null;
  isModerator: boolean;
  partnerScope: string;
  partnerIdForApi: string | null;
  authorIdForBan: string;
  isPinned: boolean;
  status: 'published' | 'hidden' | 'deleted';
  withinEditWindow: boolean;
}

export function PostMenu({
  postId,
  authorId,
  currentUserId,
  isModerator,
  partnerScope,
  partnerIdForApi: _partnerIdForApi,
  authorIdForBan,
  isPinned,
  status,
  withinEditWindow: _withinEditWindow,
}: PostMenuProps) {
  const t = useTranslations('community');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUserId !== null && currentUserId === authorId;

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function deleteAsAuthor() {
    if (!confirm('Delete this post?')) return;
    const res = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
    setOpen(false);
  }

  async function pin() {
    await fetch(`/api/community/posts/${postId}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !isPinned }),
    });
    router.refresh();
    setOpen(false);
  }

  async function toggleHide() {
    const op = status === 'hidden' ? 'unhide' : 'hide';
    await fetch(`/api/community/posts/${postId}/hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op }),
    });
    router.refresh();
    setOpen(false);
  }

  async function deleteAsMod() {
    if (!confirm('Delete this post as moderator?')) return;
    await fetch(`/api/community/posts/${postId}/hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'delete' }),
    });
    router.refresh();
    setOpen(false);
  }

  async function banAuthor() {
    if (!confirm(`Ban this author from this community?`)) return;
    const partnerId = _partnerIdForApi;
    await fetch('/api/community/bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_id: partnerId, user_id: authorIdForBan }),
    });
    router.refresh();
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-full text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
        aria-label="Post menu"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-[10px] bg-bg-secondary border border-border-default shadow-[var(--shadow-lg)] py-1 text-[13px]">
          {currentUserId && !isAuthor && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setReportOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              {t('menu_report')}
            </button>
          )}
          {isAuthor && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void deleteAsAuthor();
              }}
              className="w-full text-left px-3 py-2 text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              {t('menu_delete')}
            </button>
          )}
          {isModerator && (
            <>
              <div className="my-1 border-t border-border-default" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void pin();
                }}
                className="w-full text-left px-3 py-2 text-fg-primary hover:bg-bg-tertiary transition-colors"
              >
                {isPinned ? t('menu_unpin') : t('menu_pin')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void toggleHide();
                }}
                className="w-full text-left px-3 py-2 text-fg-primary hover:bg-bg-tertiary transition-colors"
              >
                {status === 'hidden' ? t('menu_unhide') : t('menu_hide')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void deleteAsMod();
                }}
                className="w-full text-left px-3 py-2 text-[color:var(--accent-coral,#dc2626)] hover:bg-bg-tertiary transition-colors"
              >
                {t('menu_delete')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void banAuthor();
                }}
                className="w-full text-left px-3 py-2 text-[color:var(--accent-coral,#dc2626)] hover:bg-bg-tertiary transition-colors"
              >
                {t('menu_ban_author')}
              </button>
            </>
          )}
        </div>
      )}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={postId}
        partnerScope={partnerScope}
      />
    </div>
  );
}
