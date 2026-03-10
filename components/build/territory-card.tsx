'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { Globe, Database, Rocket, Zap, Heart, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const territories = [
  { key: 'web', icon: Globe, color: 'var(--territory-web)' },
  { key: 'db', icon: Database, color: 'var(--territory-db)' },
  { key: 'saas', icon: Rocket, color: 'var(--territory-saas)' },
  { key: 'auto', icon: Zap, color: 'var(--territory-auto)' },
  { key: 'pro', icon: Heart, color: 'var(--territory-pro)' },
] as const;

const territorySlugMap: Record<string, string> = {
  web: 'web',
  db: 'database',
  saas: 'saas',
  auto: 'automations',
  pro: 'pro-bono',
};

export function TerritoryCards() {
  const t = useTranslations('build_page.territories');

  return (
    <Section>
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('headline')}
          sub={t('sub')}
          centered
          className="mb-12"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {territories.map(({ key, icon: Icon, color }) => (
            <div
              key={key}
              className="relative rounded bg-bg-secondary border border-border-default p-6 flex flex-col gap-4 overflow-hidden transition-colors duration-[var(--duration-normal)] hover:border-border-hover"
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: color }}
              />

              <div
                className="w-10 h-10 rounded flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
              >
                <Icon size={20} style={{ color }} />
              </div>

              <h3 className="font-serif text-lg text-fg-primary font-normal">
                {t(`${key}_title`)}
              </h3>
              <p className="text-sm text-fg-secondary leading-relaxed flex-1">
                {t(`${key}_desc`)}
              </p>

              <a
                href={`/explore#${territorySlugMap[key]}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-[var(--duration-fast)] hover:text-accent-teal"
                style={{ color }}
                onClick={() =>
                  trackEvent('build_territory_click', { territory: key })
                }
              >
                {t('see_examples')}
                <ArrowRight size={14} />
              </a>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
