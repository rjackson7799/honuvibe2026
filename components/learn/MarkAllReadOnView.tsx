'use client';

import { useEffect, useRef } from 'react';
import { markAllRead } from '@/lib/notifications/actions';

/**
 * Fire-and-forget: marks the viewer's notifications read on mount. `markAllRead`
 * revalidates /learn/dashboard, so the header bell badge clears on return. Guarded
 * so it runs at most once and only when there is something unread.
 */
export function MarkAllReadOnView({ hasUnread }: { hasUnread: boolean }) {
  const done = useRef(false);
  useEffect(() => {
    if (!hasUnread || done.current) return;
    done.current = true;
    void markAllRead();
  }, [hasUnread]);
  return null;
}
