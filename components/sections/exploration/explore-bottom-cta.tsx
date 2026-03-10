'use client';

import { useTranslations } from 'next-intl';
import { CTAStrip } from '@/components/sections/CTAStrip';
import { trackEvent } from '@/lib/analytics';

export function ExploreBottomCTA() {
  const t = useTranslations('exploration_page.cta_strip');

  return (
    <CTAStrip
      headline={t('headline')}
      sub={t('sub')}
      ctaLabel={t('cta')}
      ctaHref="/build"
      onCtaClick={() => trackEvent('explore_to_build_click')}
    />
  );
}
