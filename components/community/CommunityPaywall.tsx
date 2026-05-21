'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Users, Sparkles, GraduationCap } from 'lucide-react';
import {
  trackCommunityPaywallCtaClicked,
  trackCommunityPaywallViewed,
} from '@/lib/analytics';

export function CommunityPaywall() {
  const t = useTranslations('community');
  const pathname = usePathname();

  useEffect(() => {
    trackCommunityPaywallViewed({ referrer_path: pathname ?? '' });
  }, [pathname]);

  return (
    <div className="max-w-[600px] mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center">
          <Users size={28} />
        </div>
        <h1 className="text-[clamp(24px,3vw,32px)] font-bold text-fg-primary tracking-[-0.02em] mb-2">
          {t('paywall_title')}
        </h1>
        <p className="text-fg-secondary text-base">{t('paywall_subtitle')}</p>
      </div>
      <div className="space-y-3">
        <Link
          href="/learn#community-tier"
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'community_tier' })}
          className="flex items-center gap-3 p-4 rounded-[14px] bg-[color:var(--accent-teal)] text-white hover:bg-[color:var(--accent-teal-hover)] shadow-sm hover:shadow-md transition-all"
        >
          <Users size={20} />
          <span className="font-semibold flex-1">{t('paywall_cta_community')}</span>
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/learn#vault-tier"
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'vault_tier' })}
          className="flex items-center gap-3 p-4 rounded-[14px] bg-bg-secondary border border-border-default text-fg-primary hover:border-border-hover transition-colors"
        >
          <Sparkles size={20} />
          <span className="font-semibold flex-1">{t('paywall_cta_vault')}</span>
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/learn"
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'course' })}
          className="flex items-center gap-3 p-4 rounded-[14px] bg-bg-secondary border border-border-default text-fg-primary hover:border-border-hover transition-colors"
        >
          <GraduationCap size={20} />
          <span className="font-semibold flex-1">{t('paywall_cta_courses')}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
