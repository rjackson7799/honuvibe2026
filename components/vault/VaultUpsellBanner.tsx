'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { SubscribeButton } from '@/components/billing/SubscribeButton';

type VaultUpsellBannerProps = {
  count: number;
};

export function VaultUpsellBanner({ count }: VaultUpsellBannerProps) {
  const t = useTranslations('vault');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-xl bg-accent-teal/8 border border-accent-teal/20">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-accent-teal/10">
          <Lock size={15} className="text-accent-teal" />
        </div>
        <div>
          <p className="text-sm font-medium text-fg-primary">
            {t('banner.title')}
          </p>
          <p className="text-xs text-fg-tertiary mt-0.5">
            {t('banner.desc', { count })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <SubscribeButton />
        <Link
          href="/learn"
          className="text-xs text-fg-tertiary hover:text-fg-secondary transition-colors whitespace-nowrap underline underline-offset-2"
        >
          {t('banner.browse')}
        </Link>
      </div>
    </div>
  );
}
