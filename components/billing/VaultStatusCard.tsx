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
  vaultSource: 'subscription' | 'cohort' | 'seat' | 'enrollment' | null;
  activeCourseName: string | null;
  hasAccess: boolean;
  /**
   * Whether the account has a Stripe billing relationship (`stripe_customer_id`).
   * Admins and manually-granted Vault accounts have `source === 'subscription'`
   * but no Stripe customer, so the billing portal cannot be opened for them —
   * the "Manage Subscription" button is hidden in that case.
   */
  hasBillingAccount: boolean;
  /**
   * Partner sponsoring this account's Vault seat, already localized by the
   * page. Only set when `vaultSource === 'seat'`.
   */
  sponsorName?: string | null;
  /** End of the sponsoring seat block's access window (exclusive). */
  sponsorAccessEndsAt?: string | null;
};

export function VaultStatusCard({
  subscriptionStatus,
  subscriptionExpiresAt,
  vaultSource,
  activeCourseName,
  hasAccess,
  hasBillingAccount,
  sponsorName = null,
  sponsorAccessEndsAt = null,
}: VaultStatusCardProps) {
  const t = useTranslations('billing');
  const locale = useLocale();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(false);

  async function handleManage() {
    setPortalLoading(true);
    setPortalError(false);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // No redirect URL (auth/customer/portal-config failure): surface it
      // rather than leaving the button looking inert.
      console.error('Portal redirect failed:', data?.error ?? response.status);
      setPortalError(true);
    } catch (err) {
      console.error('Portal redirect failed:', err);
      setPortalError(true);
    } finally {
      setPortalLoading(false);
    }
  }

  function formatDate(value: string | null): string | null {
    if (!value) return null;
    return new Date(value).toLocaleDateString(
      locale === 'ja' ? 'ja-JP' : 'en-US',
      { month: 'long', day: 'numeric', year: 'numeric' },
    );
  }

  const nextBillingFormatted = formatDate(subscriptionExpiresAt);
  const sponsorEndsFormatted = formatDate(sponsorAccessEndsAt);

  return (
    <Card variant="learn" padding="lg">
      <SectionHeading title={t('vault_status')} bordered />

      {(vaultSource === 'subscription' || vaultSource === 'cohort') && (
        <div className="space-y-3 pt-1">
          <BadgePill variant="teal" size="sm">{t('vault_active')}</BadgePill>
          {nextBillingFormatted && (
            <p className="text-sm text-fg-secondary">
              {t('next_billing', { date: nextBillingFormatted })}
            </p>
          )}
          {hasBillingAccount && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleManage}
                disabled={portalLoading}
              >
                {portalLoading ? '...' : t('manage_subscription')}
              </Button>
              {portalError && (
                <p className="text-sm text-accent-coral">{t('portal_error')}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Sponsored seat — access is paid for by a partner, so there is no
          subscription to manage and no upsell to show. */}
      {vaultSource === 'seat' && (
        <div className="space-y-3 pt-1">
          <BadgePill variant="teal" size="sm">
            {t('vault_sponsored', { partner: sponsorName ?? '' })}
          </BadgePill>
          {sponsorEndsFormatted && (
            <p className="text-sm text-fg-secondary">
              {t('vault_sponsored_until', { date: sponsorEndsFormatted })}
            </p>
          )}
          <p className="text-sm text-fg-tertiary">{t('vault_sponsored_note')}</p>
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
