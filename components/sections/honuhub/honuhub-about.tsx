'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function HonuHubAbout() {
  const t = useTranslations('honuhub_page.about');

  return (
    <Section>
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Photo placeholder */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/15 via-bg-secondary to-accent-gold/8 border border-border-default rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-fg-tertiary text-sm tracking-wide">HonuHub Interior</span>
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-4">
            <Overline>{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
            <p className="text-base text-fg-secondary leading-relaxed">{t('description')}</p>
            <p className="text-base text-fg-secondary leading-relaxed">{t('description_2')}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
