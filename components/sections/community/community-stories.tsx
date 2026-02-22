'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card } from '@/components/ui';
import { Quote } from 'lucide-react';

const storyKeys = ['one', 'two', 'three'] as const;

export function CommunityStories() {
  const t = useTranslations('community_page.stories');

  return (
    <Section>
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {storyKeys.map((key) => (
            <Card key={key} padding="lg" className="flex flex-col">
              <Quote size={24} className="text-accent-teal/40 mb-4" />
              <p className="text-sm text-fg-secondary leading-relaxed mb-6 flex-1">
                &ldquo;{t(`items.${key}.quote`)}&rdquo;
              </p>
              <div className="border-t border-border-default pt-4">
                <p className="text-sm font-medium text-fg-primary">{t(`items.${key}.name`)}</p>
                <p className="text-xs text-fg-tertiary mt-0.5">{t(`items.${key}.role`)}</p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
