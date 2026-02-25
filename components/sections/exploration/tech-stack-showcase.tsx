'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card } from '@/components/ui';
import { TechIcon } from './tech-icon';

const techItems = [
  { key: 'nextjs', color: 'var(--fg-primary)' },
  { key: 'react', color: 'var(--accent-teal)' },
  { key: 'typescript', color: 'var(--territory-db)' },
  { key: 'tailwind', color: 'var(--accent-teal)' },
  { key: 'supabase', color: 'var(--territory-pro)' },
  { key: 'stripe', color: 'var(--territory-auto)' },
  { key: 'openai', color: 'var(--fg-primary)' },
  { key: 'nodejs', color: 'var(--territory-pro)' },
  { key: 'vercel', color: 'var(--fg-primary)' },
  { key: 'figma', color: 'var(--territory-auto)' },
  { key: 'claude', color: 'var(--accent-gold)' },
  { key: 'cursor', color: 'var(--accent-teal)' },
] as const;

export function TechStackShowcase() {
  const t = useTranslations('exploration_page.tech_stack');

  return (
    <Section>
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
          {techItems.map(({ key, color }) => (
            <Card key={key} padding="md" hover className="flex flex-col items-center gap-3 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              >
                <TechIcon name={key} size={26} />
              </div>
              <p className="text-sm font-medium text-fg-primary">{t(`items.${key}`)}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
