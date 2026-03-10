'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { SubscribeButton } from '@/components/billing/SubscribeButton';
import Link from 'next/link';
import type { ContentItemForStudent } from '@/lib/dashboard/types';

type VaultUpsellGateProps = {
  previewItems: ContentItemForStudent[];
};

export function VaultUpsellGate({ previewItems }: VaultUpsellGateProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-gold/10 mb-6">
          <Lock size={32} className="text-accent-gold" />
        </div>
        <h2 className="text-2xl font-serif text-fg-primary mb-3">
          {t('vault_upsell_heading')}
        </h2>
        <p className="text-fg-secondary max-w-md mx-auto mb-6">
          {t('vault_upsell_sub')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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

      {/* Blurred preview grid */}
      {previewItems.length > 0 && (
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-40 blur-[2px] pointer-events-none select-none">
            {previewItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="bg-bg-secondary border border-border-default rounded-lg p-4"
              >
                {item.thumbnail_url && (
                  <div className="aspect-video rounded-md overflow-hidden mb-3 bg-bg-tertiary">
                    <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block w-16 h-4 bg-bg-tertiary rounded" />
                  <span className="inline-block w-12 h-4 bg-bg-tertiary rounded" />
                </div>
                <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-1" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock size={48} className="text-fg-tertiary/50" />
          </div>
        </div>
      )}
    </div>
  );
}
