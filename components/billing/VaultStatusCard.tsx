'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SubscribeButton } from './SubscribeButton';

type VaultStatusCardProps = {
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  vaultSource: 'subscription' | 'enrollment' | null;
  activeCourseName: string | null;
  hasAccess: boolean;
};

export function VaultStatusCard({
  subscriptionStatus,
  subscriptionExpiresAt,
  vaultSource,
  activeCourseName,
  hasAccess,
}: VaultStatusCardProps) {
  const t = useTranslations('billing');
  const locale = useLocale();
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleManage() {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Portal redirect failed:', err);
    } finally {
      setPortalLoading(false);
    }
  }

  const nextBillingFormatted = subscriptionExpiresAt
    ? new Date(subscriptionExpiresAt).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      )
    : null;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
      <h2 className="text-lg font-serif text-fg-primary mb-4">{t('vault_status')}</h2>

      {vaultSource === 'subscription' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-teal/15 text-accent-teal">
              {t('vault_active')}
            </span>
          </div>
          {nextBillingFormatted && (
            <p className="text-sm text-fg-secondary">
              {t('next_billing', { date: nextBillingFormatted })}
            </p>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleManage}
            disabled={portalLoading}
          >
            {portalLoading ? '...' : t('manage_subscription')}
          </Button>
        </div>
      )}

      {vaultSource === 'enrollment' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-gold/15 text-accent-gold">
              {t('vault_included', { courseName: activeCourseName ?? '' })}
            </span>
          </div>
          <p className="text-sm text-fg-tertiary">
            {t('vault_pitch')}
          </p>
        </div>
      )}

      {!hasAccess && (
        <div className="space-y-3">
          <p className="text-sm text-fg-secondary">{t('vault_pitch')}</p>
          <SubscribeButton />
        </div>
      )}
    </div>
  );
}
