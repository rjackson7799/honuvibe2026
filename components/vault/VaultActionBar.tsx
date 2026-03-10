'use client';

import { useState, useEffect } from 'react';
import { Bookmark, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleBookmark } from '@/lib/vault/actions';
import { trackEvent } from '@/lib/analytics';
import { VaultKeyboardShortcuts } from './VaultKeyboardShortcuts';
import type { VaultUserState } from '@/lib/vault/types';

type VaultActionBarProps = {
  itemId: string;
  userState: VaultUserState;
  isVideo: boolean;
  seriesPrevHref?: string | null;
  seriesNextHref?: string | null;
};

export function VaultActionBar({ itemId, userState, isVideo, seriesPrevHref, seriesNextHref }: VaultActionBarProps) {
  const [bookmarked, setBookmarked] = useState(userState.isBookmarked);
  const [watchLater, setWatchLater] = useState(userState.isWatchLater);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('vault_item_view');
  }, [itemId]);

  async function handleToggle(type: 'bookmark' | 'watch_later') {
    setLoading(type);
    // Optimistic update
    if (type === 'bookmark') setBookmarked((v) => !v);
    else setWatchLater((v) => !v);

    try {
      await toggleBookmark(itemId, type);
      trackEvent(type === 'bookmark' ? 'vault_bookmark' : 'vault_watch_later');
    } catch {
      // Revert on error
      if (type === 'bookmark') setBookmarked((v) => !v);
      else setWatchLater((v) => !v);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <VaultKeyboardShortcuts
        onBookmark={() => handleToggle('bookmark')}
        seriesPrevHref={seriesPrevHref}
        seriesNextHref={seriesNextHref}
      />
      <button
        type="button"
        onClick={() => handleToggle('bookmark')}
        disabled={loading === 'bookmark'}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
          bookmarked
            ? 'bg-accent-teal/10 text-accent-teal border-accent-teal/30'
            : 'text-fg-secondary border-border-default hover:text-fg-primary hover:bg-bg-tertiary',
        )}
      >
        <Bookmark size={16} className={bookmarked ? 'fill-current' : ''} />
        {bookmarked ? 'Bookmarked' : 'Bookmark'}
      </button>

      {isVideo && (
        <button
          type="button"
          onClick={() => handleToggle('watch_later')}
          disabled={loading === 'watch_later'}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
            watchLater
              ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/30'
              : 'text-fg-secondary border-border-default hover:text-fg-primary hover:bg-bg-tertiary',
          )}
        >
          {watchLater ? <Check size={16} /> : <Clock size={16} />}
          {watchLater ? 'In Queue' : 'Watch Later'}
        </button>
      )}
    </div>
  );
}
