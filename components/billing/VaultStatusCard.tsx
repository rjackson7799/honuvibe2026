'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/learn/SectionHeading';
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
    <Card variant="learn" padding="lg">
      <SectionHeading title={t('vault_status')} bordered />

      {vaultSource === 'subscription' && (
        <div className="space-y-3 pt-1">
          <BadgePill variant="teal" size="sm">{t('vault_active')}</BadgePill>
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
        <div className="space-y-3 pt-1">
          <BadgePill variant="coral" size="sm">
            {t('vault_included', { courseName: activeCourseName ?? '' })}
          </BadgePill>
          <p className="text-sm text-fg-tertiary">{t('vault_pitch')}</p>
        </div>
      )}

      {!hasAccess && (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-fg-secondary">{t('vault_pitch')}</p>
          <SubscribeButton />
        </div>
      )}
    </Card>
  );
}
