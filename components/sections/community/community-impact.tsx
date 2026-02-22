'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';

const statKeys = ['members', 'projects', 'countries', 'sessions'] as const;

export function CommunityImpact() {
  const t = useTranslations('community_page.impact');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          centered
        />

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {statKeys.map((key) => (
            <div key={key} className="text-center p-6 rounded-xl bg-bg-secondary/50 border border-border-default">
              <p className="font-serif text-h2 text-accent-teal mb-1">{t(`stats.${key}`)}</p>
              <p className="text-sm text-fg-secondary">{t(`stats.${key}_label`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
