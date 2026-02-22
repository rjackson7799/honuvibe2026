'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Button } from '@/components/ui';
import { Check } from 'lucide-react';

const tierKeys = ['drop_in', 'monthly', 'founding'] as const;
const tierAccents = ['var(--accent-teal)', 'var(--accent-gold)', 'var(--territory-auto)'];

export function HonuHubMembership() {
  const t = useTranslations('honuhub_page.membership');

  return (
    <Section>
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {tierKeys.map((key, i) => {
            const features = t(`tiers.${key}.features`).split(',');
            const isHighlighted = key === 'monthly';

            return (
              <Card
                key={key}
                padding="lg"
                className={`relative flex flex-col overflow-hidden ${isHighlighted ? 'border-accent-teal/40 shadow-accent' : ''}`}
              >
                {/* Top accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: tierAccents[i] }}
                />

                <div className="pt-2 flex-1 flex flex-col">
                  <h3 className="font-serif text-h3 text-fg-primary mb-2">
                    {t(`tiers.${key}.title`)}
                  </h3>
                  <p className="text-sm text-fg-tertiary mb-6">
                    {t(`tiers.${key}.price`)}
                  </p>

                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check size={16} className="text-accent-teal mt-0.5 shrink-0" />
                        <span className="text-sm text-fg-secondary">{feature.trim()}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isHighlighted ? 'primary' : 'ghost'}
                    fullWidth
                  >
                    {t(`tiers.${key}.title`)}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
