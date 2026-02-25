'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { MapPin } from 'lucide-react';

export function AboutFounder() {
  const t = useTranslations('about_page.founder');

  return (
    <Section>
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Photo placeholder */}
          <div className="relative mx-auto aspect-[3/4] max-w-[400px] overflow-hidden rounded-xl md:mx-0">
            <div className="absolute inset-0 rounded-xl border border-border-default bg-gradient-to-br from-accent-teal/15 via-bg-secondary to-accent-gold/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm tracking-wide text-fg-tertiary">Ryan Jackson</span>
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-4 text-center md:text-left">
            <Overline>{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
            <p className="text-lg font-medium text-accent-teal">{t('role')}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-fg-tertiary md:justify-start">
              <MapPin size={16} />
              <span>{t('location')}</span>
            </div>
            <p className="text-base leading-relaxed text-fg-secondary">{t('bio_p1')}</p>
            <p className="text-base leading-relaxed text-fg-secondary">{t('bio_p2')}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
