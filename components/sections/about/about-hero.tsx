'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function AboutHero() {
  const t = useTranslations('about_page.hero');

  return (
    <Section noReveal className="relative min-h-[70vh] overflow-hidden flex items-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5" />

      {/* Glow orbs */}
      <div className="glow-orb absolute -top-20 right-1/4 h-[300px] w-[300px] bg-glow-teal" />
      <div className="glow-orb absolute bottom-0 left-[16%] h-[200px] w-[200px] bg-glow-gold" />

      <Container className="w-full">
        <div className="relative flex flex-col items-center text-center">
          <Overline className="mb-4">{t('overline')}</Overline>
          <h1 className="mb-4 font-serif text-h1 text-fg-primary">{t('heading')}</h1>
          <p className="max-w-[540px] text-base leading-relaxed text-fg-secondary md:text-lg">
            {t('sub')}
          </p>
        </div>
      </Container>
    </Section>
  );
}
