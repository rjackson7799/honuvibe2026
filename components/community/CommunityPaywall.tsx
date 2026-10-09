'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import {
  trackCommunityPaywallCtaClicked,
  trackCommunityPaywallViewed,
} from '@/lib/analytics';

/**
 * Defensive fallback for the Community feed.
 *
 * Honu Community is free for every signed-in account since migration 078, and
 * the dashboard route is auth-guarded, so this only renders when the session
 * exists but has_community_access() still says no — in practice a missing
 * public.users row (profile not provisioned yet). There is nothing to sell
 * here; point the member at a refresh, support, or the course catalog.
 */
export function CommunityPaywall() {
  const t = useTranslations('community');
  const locale = useLocale();
  const pathname = usePathname();
  const prefix = locale === 'ja' ? '/ja' : '';

  useEffect(() => {
    trackCommunityPaywallViewed({ referrer_path: pathname ?? '' });
  }, [pathname]);

  return (
    <div className="max-w-[560px] mx-auto py-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center">
        <Users size={28} />
      </div>
      <h1 className="text-[clamp(24px,3vw,32px)] font-bold text-fg-primary tracking-[-0.02em] mb-2">
        {t('paywall_title')}
      </h1>
      <p className="text-fg-secondary text-base">{t('paywall_subtitle')}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`${prefix}/contact`}
          className="inline-flex min-h-11 items-center rounded-[10px] border border-border-default bg-bg-secondary px-4 py-2 text-sm font-semibold text-fg-primary hover:border-border-hover transition-colors"
        >
          {t('paywall_contact')}
        </Link>
        <Link
          href={`${prefix}/learn`}
          onClick={() => trackCommunityPaywallCtaClicked({ cta: 'courses' })}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-[color:var(--accent-teal)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent-teal-hover)] transition-colors"
        >
          {t('paywall_cta_courses')} →
        </Link>
      </div>
    </div>
  );
}
