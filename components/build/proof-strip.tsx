'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';

const statKeys = ['stat_1', 'stat_2', 'stat_3'] as const;

export function ProofStrip() {
  const t = useTranslations('build_page.proof');

  return (
    <Section className="!py-8 md:!py-12">
      <Container>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {statKeys.map((key) => (
            <div key={key} className="flex flex-col items-center text-center gap-1">
              <span className="font-serif text-h3 text-accent-teal">{t(`${key}_value`)}</span>
              <span className="text-sm text-fg-tertiary">{t(`${key}_label`)}</span>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
