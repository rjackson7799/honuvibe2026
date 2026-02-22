'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button, Overline } from '@/components/ui';
import { MapPin } from 'lucide-react';

export function HonuHubHero() {
  const t = useTranslations('honuhub_page.hero');

  return (
    <Section noReveal>
      <div className="relative overflow-hidden">
        {/* Background gradient placeholder for hero photo */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5" />
        <Container>
          <div className="relative py-16 md:py-24 flex flex-col items-center text-center">
            <Overline className="mb-4">{t('overline')}</Overline>
            <h1 className="font-serif text-h1 text-fg-primary mb-4">{t('heading')}</h1>
            <p className="max-w-[540px] text-base md:text-lg text-fg-secondary leading-relaxed mb-4">
              {t('sub')}
            </p>
            <div className="flex items-center gap-2 text-fg-tertiary text-sm mb-8">
              <MapPin size={16} />
              <span>Waikiki, Honolulu, Hawaii</span>
            </div>
            <Button variant="primary" size="lg">{t('cta')}</Button>
          </div>
        </Container>
      </div>
    </Section>
  );
}
