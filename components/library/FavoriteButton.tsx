'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

type FavoriteButtonProps = {
  videoId: string;
  isFavorited: boolean;
  locale: string;
  ariaLabelAdd?: string;
  ariaLabelRemove?: string;
};

export function FavoriteButton({
  videoId,
  isFavorited: initialFavorited,
  locale,
  ariaLabelAdd = 'Add to favorites',
  ariaLabelRemove = 'Remove from favorites',
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !favorited;
    setFavorited(next); // Optimistic update
    setLoading(true);

    try {
      const res = await fetch('/api/library/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          action: next ? 'add' : 'remove',
        }),
      });

      if (!res.ok) {
        setFavorited(!next); // Revert on failure
      } else {
        trackEvent('library_favorite', {
          video_slug: videoId,
          action: next ? 'add' : 'remove',
          locale,
        });
      }
    } catch {
      setFavorited(!next); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={loading}
      aria-label={favorited ? ariaLabelRemove : ariaLabelAdd}
      className={cn(
        'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:bg-bg-tertiary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-teal',
      )}
    >
      <Heart
        size={18}
        className={cn(
          'transition-colors duration-[var(--duration-fast)]',
          favorited ? 'fill-accent-teal text-accent-teal' : 'text-fg-tertiary',
        )}
      />
    </button>
  );
}
