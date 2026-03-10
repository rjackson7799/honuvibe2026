'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button, Overline } from '@/components/ui';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export function BuildHero() {
  const t = useTranslations('build_page.hero');

  return (
    <Section noReveal className="relative overflow-hidden min-h-[50vh] md:min-h-[60vh] flex items-center !pb-8">
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, var(--bg-tertiary) 0%, var(--bg-primary) 100%)',
        }}
      />

      <Container>
        <div className="relative flex flex-col items-center text-center">
          <Overline className="mb-4 block">{t('overline')}</Overline>
          <h1 className="font-serif text-h1 text-fg-primary mb-4">
            {t('headline')}
          </h1>
          <p className="max-w-[600px] mx-auto text-base md:text-lg text-fg-secondary leading-relaxed mb-8">
            {t('sub')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={ArrowDown}
              iconPosition="right"
              href="#inquire"
              onClick={() => trackEvent('build_engage_card_click', { engagement_type: 'hero_cta' })}
            >
              {t('cta_primary')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              href="/explore"
            >
              {t('cta_secondary')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
