'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui';
import { Globe, Languages, Rocket, Wrench } from 'lucide-react';

const icons = [Globe, Languages, Rocket, Wrench] as const;
const keys = ['global', 'bilingual', 'projects', 'practitioners'] as const;

export function MissionStrip() {
  const t = useTranslations('mission');

  return (
    <Section id="mission">
      <Container size="wide">
        <Overline className="mb-10 block text-center">{t('overline')}</Overline>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {keys.map((key, i) => {
            const Icon = icons[i];
            return (
              <div
                key={key}
                className="group flex flex-col items-center text-center p-6 rounded-lg bg-bg-secondary/50 border border-border-default hover:border-accent-teal/30 transition-all duration-[var(--duration-normal)]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-teal-subtle">
                  <Icon size={22} className="text-accent-teal" />
                </div>
                <h3 className="font-serif text-lg text-fg-primary mb-2">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="text-sm text-fg-secondary leading-relaxed">
                  {t(`items.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
