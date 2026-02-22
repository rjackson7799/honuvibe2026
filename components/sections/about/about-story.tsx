'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';

export function AboutStory() {
  const t = useTranslations('about_page.story');

  return (
    <Section>
      <Container size="narrow">
        <Overline className="mb-4 block">{t('overline')}</Overline>
        <h2 className="font-serif text-h2 text-fg-primary mb-8">{t('heading')}</h2>
        <div className="flex flex-col gap-5">
          <p className="text-base text-fg-secondary leading-relaxed">{t('paragraphs.p1')}</p>
          <p className="text-base text-fg-secondary leading-relaxed">{t('paragraphs.p2')}</p>
          <p className="text-base text-fg-secondary leading-relaxed">{t('paragraphs.p3')}</p>
        </div>
      </Container>
    </Section>
  );
}
