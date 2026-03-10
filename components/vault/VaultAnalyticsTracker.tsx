'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

type VaultAnalyticsTrackerProps = {
  event: string;
  props?: Record<string, string>;
};

export function VaultAnalyticsTracker({ event, props }: VaultAnalyticsTrackerProps) {
  useEffect(() => {
    trackEvent(event, props);
  }, [event, props]);

  return null;
}
