'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function AboutHero() {
  const t = useTranslations('about_page.hero');

  return (
    <Section noReveal className="relative min-h-[50vh] md:min-h-[70vh] flex items-center !pb-0">
      <Container className="relative z-10 w-full">
        <div className="flex flex-col items-center text-center">
          <Overline className="mb-4">{t('overline')}</Overline>
          <h1 className="mb-4 font-serif text-h1 text-fg-primary">{t('heading')}</h1>
          <p className="max-w-[600px] text-base leading-relaxed text-fg-secondary md:text-lg">
            {t('sub')}
          </p>
        </div>
      </Container>
    </Section>
  );
}
