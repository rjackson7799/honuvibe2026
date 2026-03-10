'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button, Overline } from '@/components/ui';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { LighthouseBackground } from './lighthouse-background';

export function ExplorationHero() {
  const t = useTranslations('exploration_page');

  return (
    <Section noReveal className="relative overflow-hidden min-h-[50vh] md:min-h-[60vh] flex items-center !pb-8">
      <LighthouseBackground />

      <Container>
        <div className="relative flex flex-col items-center text-center">
          <Overline className="mb-4 block">{t('hero.overline')}</Overline>
          <h1 className="font-serif text-h1 text-fg-primary mb-4">
            <span className="text-shimmer">{t('hero.heading')}</span>
          </h1>
          <p className="max-w-[560px] mx-auto text-base md:text-lg text-fg-secondary leading-relaxed mb-8">
            {t('hero.sub')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={ArrowDown}
              iconPosition="right"
              href="#projects"
            >
              {t('hero_cta_primary')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              href="/build"
            >
              {t('hero_cta_secondary')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
