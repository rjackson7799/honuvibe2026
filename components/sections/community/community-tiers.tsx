'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Button } from '@/components/ui';
import { Check } from 'lucide-react';

const tierKeys = ['free', 'paid'] as const;

export function CommunityTiers() {
  const t = useTranslations('community_page.tiers');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 max-w-[700px] mx-auto">
          {tierKeys.map((key) => {
            const features = t(`${key}.features`).split(',');
            const isPaid = key === 'paid';

            return (
              <Card
                key={key}
                padding="lg"
                className={`flex flex-col ${isPaid ? 'border-accent-teal/40 shadow-accent' : ''}`}
              >
                <h3 className="font-serif text-h3 text-fg-primary mb-1">{t(`${key}.title`)}</h3>
                <p className="text-sm text-accent-gold font-medium mb-6">{t(`${key}.price`)}</p>

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={16} className="text-accent-teal mt-0.5 shrink-0" />
                      <span className="text-sm text-fg-secondary">{feature.trim()}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPaid ? 'primary' : 'ghost'}
                  fullWidth
                  href="https://www.skool.com/honuvibe"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(`${key}.title`)}
                </Button>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
