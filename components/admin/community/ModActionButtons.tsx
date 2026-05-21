'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function actionButton(props: {
  label: string;
  onClick: () => Promise<void> | void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={() => void props.onClick()}
      className={
        props.variant === 'danger'
          ? 'px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-[color:var(--accent-coral-subtle,#fef2f2)] text-[color:var(--accent-coral,#dc2626)] border border-[color:var(--accent-coral,#dc2626)]/30 hover:bg-[color:var(--accent-coral,#dc2626)]/15 transition-colors'
          : 'px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-bg-tertiary text-fg-primary border border-border-default hover:border-border-hover transition-colors'
      }
    >
      {props.label}
    </button>
  );
}

export function ResolveReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return actionButton({
    label: busy ? '…' : 'Resolve',
    onClick: async () => {
      setBusy(true);
      const res = await fetch(`/api/community/reports/${reportId}`, { method: 'PATCH' });
      if (res.ok) router.refresh();
      setBusy(false);
    },
  });
}

export function HidePostButton({
  postId,
  op,
}: {
  postId: string;
  op: 'hide' | 'unhide' | 'delete';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const label = op === 'hide' ? 'Hide' : op === 'unhide' ? 'Unhide' : 'Delete';
  return actionButton({
    label: busy ? '…' : label,
    variant: op === 'delete' ? 'danger' : 'default',
    onClick: async () => {
      if (op === 'delete' && !confirm('Delete this post as moderator?')) return;
      setBusy(true);
      const res = await fetch(`/api/community/posts/${postId}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op }),
      });
      if (res.ok) router.refresh();
      setBusy(false);
    },
  });
}

export function PinPostButton({
  postId,
  pinned,
}: {
  postId: string;
  pinned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return actionButton({
    label: busy ? '…' : pinned ? 'Unpin' : 'Pin',
    onClick: async () => {
      setBusy(true);
      const res = await fetch(`/api/community/posts/${postId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !pinned }),
      });
      if (res.ok) router.refresh();
      setBusy(false);
    },
  });
}

export function BanAuthorButton({
  partnerId,
  userId,
}: {
  partnerId: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return actionButton({
    label: busy ? '…' : 'Ban',
    variant: 'danger',
    onClick: async () => {
      if (!confirm('Ban this user from this community?')) return;
      setBusy(true);
      const res = await fetch('/api/community/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId, user_id: userId }),
      });
      if (res.ok) router.refresh();
      setBusy(false);
    },
  });
}

export function UnbanButton({
  partnerId,
  userId,
}: {
  partnerId: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return actionButton({
    label: busy ? '…' : 'Unban',
    onClick: async () => {
      setBusy(true);
      const url = new URL(`/api/community/bans/${userId}`, window.location.origin);
      if (partnerId) url.searchParams.set('partner_id', partnerId);
      const res = await fetch(url.toString(), { method: 'DELETE' });
      if (res.ok) router.refresh();
      setBusy(false);
    },
  });
}
