'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { Heart } from 'lucide-react';

export function CommunityProbono() {
  const t = useTranslations('community_page.probono');

  return (
    <Section>
      <Container size="narrow">
        <div className="relative overflow-hidden rounded-2xl border border-territory-pro/20 bg-bg-secondary p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-territory-pro/5 via-transparent to-accent-teal/5 pointer-events-none" />
          <div className="relative text-center">
            <Heart size={28} className="mx-auto text-territory-pro/60 mb-4" />
            <Overline className="mb-4 block">{t('overline')}</Overline>
            <h2 className="font-serif text-h3 text-fg-primary mb-4">{t('heading')}</h2>
            <p className="text-base text-fg-secondary leading-relaxed mb-4 max-w-[520px] mx-auto">
              {t('description')}
            </p>
            <p className="text-sm text-accent-teal italic">{t('featured')}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
