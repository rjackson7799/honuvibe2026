'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type VaultKeyboardShortcutsProps = {
  onSearch?: () => void;
  onBookmark?: () => void;
  seriesPrevHref?: string | null;
  seriesNextHref?: string | null;
};

export function VaultKeyboardShortcuts({
  onSearch,
  onBookmark,
  seriesPrevHref,
  seriesNextHref,
}: VaultKeyboardShortcutsProps) {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          onSearch?.();
          break;
        case 'b':
          onBookmark?.();
          break;
        case 'j':
          if (seriesNextHref) {
            router.push(seriesNextHref);
          }
          break;
        case 'k':
          if (seriesPrevHref) {
            router.push(seriesPrevHref);
          }
          break;
      }
    },
    [onSearch, onBookmark, seriesNextHref, seriesPrevHref, router],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}
