'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { SubscriptionTier } from '@/lib/stripe/tiers';

type Props = {
  tier?: SubscriptionTier;
};

export function SubscribeButton({ tier = 'vault' }: Props) {
  const t = useTranslations('billing');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, tier }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Subscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const label = tier === 'community' ? t('subscribe_community') : t('subscribe_vault');

  return (
    <Button variant="gold" onClick={handleSubscribe} disabled={loading}>
      {loading ? '...' : label}
    </Button>
  );
}
