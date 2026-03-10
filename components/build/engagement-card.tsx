'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Button } from '@/components/ui';
import { Hammer, Lightbulb, Heart, ArrowDown } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const engagements = [
  { key: 'project', icon: Hammer },
  { key: 'consulting', icon: Lightbulb },
  { key: 'probono', icon: Heart },
] as const;

export function EngagementCards() {
  const t = useTranslations('build_page.engage');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('headline')}
          centered
          className="mb-12"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {engagements.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="rounded bg-bg-secondary border border-border-default p-6 flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center">
                <Icon size={20} className="text-accent-teal" />
              </div>

              <h3 className="font-serif text-lg text-fg-primary font-normal">
                {t(`${key}_title`)}
              </h3>
              <p className="text-sm text-fg-secondary leading-relaxed flex-1">
                {t(`${key}_desc`)}
              </p>

              <Button
                variant="ghost"
                size="sm"
                icon={ArrowDown}
                iconPosition="right"
                href="#inquire"
                onClick={() =>
                  trackEvent('build_engage_card_click', { engagement_type: key })
                }
              >
                {t('cta')}
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
