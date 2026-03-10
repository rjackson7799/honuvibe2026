'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PremiumUpgradeCardProps = {
  variant?: 'inline' | 'banner';
};

export function PremiumUpgradeCard({
  variant = 'inline',
}: PremiumUpgradeCardProps) {
  const t = useTranslations('subscription');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: locale === 'ja' ? 'jpy' : 'usd' }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error('Failed to start subscription checkout');
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'banner') {
    return (
      <div className="rounded-lg border border-accent-gold/30 bg-accent-gold/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent-gold flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-fg-primary">
                {t('premium_title')}
              </p>
              <p className="text-xs text-fg-secondary">
                {t('premium_subtitle')}
              </p>
            </div>
          </div>
          <Button
            variant="gold"
            size="sm"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {t('upgrade_cta')}
          </Button>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 p-3 text-center">
      <Sparkles className="h-4 w-4 text-accent-gold mx-auto mb-1" />
      <p className="text-xs text-fg-secondary mb-2">{t('premium_subtitle')}</p>
      <Button
        variant="gold"
        size="sm"
        onClick={handleUpgrade}
        disabled={loading}
      >
        {locale === 'ja' ? t('price_monthly_jpy') : t('price_monthly')} — {t('upgrade_cta')}
      </Button>
    </div>
  );
}
