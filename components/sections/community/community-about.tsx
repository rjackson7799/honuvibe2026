'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function CommunityAbout() {
  const t = useTranslations('community_page.about');

  return (
    <Section>
      <Container size="narrow">
        <Overline className="mb-4 block">{t('overline')}</Overline>
        <h2 className="font-serif text-h2 text-fg-primary mb-6">{t('heading')}</h2>
        <p className="text-base text-fg-secondary leading-relaxed mb-4">{t('description')}</p>
        <p className="text-base text-fg-secondary leading-relaxed">{t('description_2')}</p>
      </Container>
    </Section>
  );
}
