'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card } from '@/components/ui';
import { Zap, Building2, RefreshCw } from 'lucide-react';

const cards = [
  { key: 'card1', icon: Zap, accent: 'teal' },
  { key: 'card2', icon: Building2, accent: 'gold' },
  { key: 'card3', icon: RefreshCw, accent: 'teal' },
] as const;

const accentBorder = {
  teal: 'border-accent-teal/15',
  gold: 'border-accent-gold/15',
} as const;

const accentText = {
  teal: 'text-accent-teal',
  gold: 'text-accent-gold',
} as const;

export function ClaudeWorkflowCallout() {
  const t = useTranslations('build_page.claude_workflow');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
          className="mb-12"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map(({ key, icon: Icon, accent }) => (
            <Card
              key={key}
              variant="glass"
              hover
              padding="lg"
              className={`flex flex-col border ${accentBorder[accent]}`}
            >
              <div className={`mb-4 ${accentText[accent]}`}>
                <Icon size={24} />
              </div>
              <h3 className="mb-2 text-base font-medium text-fg-primary">
                {t(`${key}_title` as const)}
              </h3>
              <p className="text-sm leading-relaxed text-fg-secondary">
                {t(`${key}_desc` as const)}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
