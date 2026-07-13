'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { trackCommunityPostLiked } from '@/lib/analytics';

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  partnerScope,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  partnerScope: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: nextLiked ? 'POST' : 'DELETE',
      });
      if (!res.ok) {
        // Roll back
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
      } else if (nextLiked) {
        trackCommunityPostLiked({ partner_scope: partnerScope });
      }
      router.refresh();
    } catch {
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={
        'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 -mx-2 rounded-full text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-teal)] ' +
        (liked
          ? 'font-medium text-[color:var(--accent-coral,#dc2626)]'
          : 'text-fg-tertiary hover:text-fg-primary')
      }
      aria-pressed={liked}
    >
      <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
      {count}
    </button>
  );
}
