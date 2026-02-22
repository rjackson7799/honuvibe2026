'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card } from '@/components/ui';
import { Users, Building2, Wifi } from 'lucide-react';

const modes = [
  { key: 'in_person', Icon: Users, accent: 'var(--accent-teal)' },
  { key: 'conference', Icon: Building2, accent: 'var(--accent-gold)' },
  { key: 'remote', Icon: Wifi, accent: 'var(--territory-db)' },
] as const;

export function HonuHubModes() {
  const t = useTranslations('honuhub_page.modes');

  return (
    <Section>
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {modes.map(({ key, Icon, accent }) => (
            <Card key={key} padding="lg" className="relative overflow-hidden">
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: accent }}
              />
              <div className="pt-2">
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${accent}15` }}
                >
                  <Icon size={22} style={{ color: accent }} />
                </div>
                <h3 className="font-serif text-h3 text-fg-primary mb-3">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-sm text-fg-secondary leading-relaxed">
                  {t(`${key}.description`)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
