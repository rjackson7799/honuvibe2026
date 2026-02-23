'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function ExplorationHero() {
  const t = useTranslations('exploration_page.hero');

  return (
    <Section noReveal className="!py-0">
      <div
        className="relative overflow-hidden bg-cover bg-center bg-fixed"
        style={{ backgroundImage: 'url(/images/exploration/Exploration_Island.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/75" />
        <Container className="relative z-10">
          <div className="py-12 md:py-20 text-center">
            <Overline className="mb-4 block">{t('overline')}</Overline>
            <h1 className="font-serif text-h1 text-fg-primary mb-4">{t('heading')}</h1>
            <p className="max-w-[560px] mx-auto text-base md:text-lg text-fg-secondary leading-relaxed">
              {t('sub')}
            </p>
          </div>
        </Container>
      </div>
    </Section>
  );
}
