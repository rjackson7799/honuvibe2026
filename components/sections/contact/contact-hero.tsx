'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function ContactHero() {
  const t = useTranslations('contact_page.hero');

  return (
    <Section noReveal>
      <Container size="narrow">
        <div className="py-12 md:py-20 text-center">
          <Overline className="mb-4 block">{t('overline')}</Overline>
          <h1 className="font-serif text-h1 text-fg-primary mb-4">{t('heading')}</h1>
          <p className="text-base md:text-lg text-fg-secondary leading-relaxed max-w-[520px] mx-auto">
            {t('sub')}
          </p>
        </div>
      </Container>
    </Section>
  );
}
