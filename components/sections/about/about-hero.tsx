'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { MapPin } from 'lucide-react';

export function AboutHero() {
  const t = useTranslations('about_page.hero');

  return (
    <Section noReveal>
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 py-12 md:py-20 md:grid-cols-2 md:gap-16">
          {/* Photo placeholder */}
          <div className="relative aspect-[3/4] max-w-[400px] mx-auto md:mx-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-teal/15 via-bg-secondary to-accent-gold/10 border border-border-default" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-fg-tertiary text-sm tracking-wide">Ryan Jackson</span>
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-4 text-center md:text-left">
            <Overline>{t('overline')}</Overline>
            <h1 className="font-serif text-h1 text-fg-primary">{t('heading')}</h1>
            <p className="text-lg text-accent-teal font-medium">{t('role')}</p>
            <div className="flex items-center gap-2 text-fg-tertiary text-sm justify-center md:justify-start">
              <MapPin size={16} />
              <span>{t('location')}</span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
