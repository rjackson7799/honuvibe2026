'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { OceanCanvas } from '@/components/ocean/ocean-canvas';

export function ExplorationHero() {
  const t = useTranslations('exploration_page.hero');

  return (
    <Section noReveal className="!py-0">
      <div className="relative overflow-hidden">
        {/* Layer 0: Animated ocean canvas */}
        <OceanCanvas className="z-0" />

        {/* Layer 1: Bottom fade into page background */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-bg-primary/70" />

        {/* Layer 2: Territory-colored glow orbs */}
        <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="glow-orb"
            style={{ width: '400px', height: '400px', top: '-5%', right: '-3%', background: 'var(--territory-web)', opacity: 0.18 }}
          />
          <div
            className="glow-orb"
            style={{ width: '350px', height: '350px', top: '40%', left: '-5%', background: 'var(--territory-db)', opacity: 0.14, animationDelay: '-3s' }}
          />
          <div
            className="glow-orb"
            style={{ width: '300px', height: '300px', bottom: '5%', right: '15%', background: 'var(--territory-saas)', opacity: 0.12, animationDelay: '-6s' }}
          />
          <div
            className="glow-orb"
            style={{ width: '320px', height: '320px', top: '10%', left: '20%', background: 'var(--territory-auto)', opacity: 0.13, animationDelay: '-9s' }}
          />
          <div
            className="glow-orb"
            style={{ width: '280px', height: '280px', bottom: '15%', left: '5%', background: 'var(--territory-pro)', opacity: 0.11, animationDelay: '-2s' }}
          />
        </div>

        {/* Layer 3: Content */}
        <Container className="relative z-10">
          <div className="py-20 md:py-32 text-center">
            <Overline className="mb-4 block">{t('overline')}</Overline>
            <h1 className="font-serif text-display text-fg-primary mb-4">
              <span className="text-shimmer">{t('heading')}</span>
            </h1>
            <p className="max-w-[560px] mx-auto text-base md:text-lg text-fg-secondary leading-relaxed">
              {t('sub')}
            </p>
          </div>
        </Container>
      </div>
    </Section>
  );
}
