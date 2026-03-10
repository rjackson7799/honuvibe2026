'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, BookOpen, Video, Download, Sparkles } from 'lucide-react';
import { SubscribeButton } from '@/components/billing/SubscribeButton';
import { trackEvent } from '@/lib/analytics';
import Link from 'next/link';

const features = [
  { icon: Video, labelKey: 'vault_gate_videos' },
  { icon: BookOpen, labelKey: 'vault_gate_guides' },
  { icon: Download, labelKey: 'vault_gate_downloads' },
  { icon: Sparkles, labelKey: 'vault_gate_series' },
];

export function VaultPremiumGate() {
  const t = useTranslations('dashboard');

  useEffect(() => {
    trackEvent('vault_premium_gate');
  }, []);

  return (
    <div className="text-center py-16 px-4 max-w-lg mx-auto">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-gold/10 mb-6">
        <Lock size={32} className="text-accent-gold" />
      </div>
      <h2 className="text-2xl font-serif text-fg-primary mb-3">
        {t('vault_upsell_heading')}
      </h2>
      <p className="text-fg-secondary mb-8">
        {t('vault_upsell_sub')}
      </p>

      {/* Feature list */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.labelKey}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg-secondary border border-border-default text-left"
            >
              <Icon size={16} className="shrink-0 text-accent-teal" />
              <span className="text-xs text-fg-secondary">{t(f.labelKey)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3" onClick={() => trackEvent('vault_subscribe_click')}>
        <SubscribeButton />
        <Link
          href="/learn"
          className="text-sm text-fg-tertiary hover:text-fg-secondary transition-colors underline underline-offset-2"
        >
          {t('vault_upsell_browse_courses')}
        </Link>
      </div>
      <p className="text-xs text-fg-tertiary mt-3">
        {t('vault_upsell_or_enroll')}
      </p>
    </div>
  );
}
