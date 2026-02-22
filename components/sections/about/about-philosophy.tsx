'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function AboutPhilosophy() {
  const t = useTranslations('about_page.philosophy');

  return (
    <Section>
      <Container size="narrow">
        <div className="relative rounded-2xl bg-bg-secondary border border-border-default p-8 md:p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-accent-teal/5 pointer-events-none rounded-2xl" />
          <div className="relative">
            <Overline className="mb-6 block">{t('overline')}</Overline>
            <blockquote className="font-serif text-h3 text-fg-primary leading-snug mb-6">
              &ldquo;{t('quote')}&rdquo;
            </blockquote>
            <p className="text-base text-fg-secondary leading-relaxed max-w-[480px] mx-auto">
              {t('description')}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
