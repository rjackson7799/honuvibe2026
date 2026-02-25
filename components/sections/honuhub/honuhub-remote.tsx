'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { Monitor, Wifi, Video, type LucideIcon } from 'lucide-react';

const featureKeys = ['streaming', 'recording', 'interactive'] as const;

const featureIcons: Record<typeof featureKeys[number], LucideIcon> = {
  streaming: Wifi,
  recording: Video,
  interactive: Monitor,
};

export function HonuHubRemote() {
  const t = useTranslations('honuhub_page.remote');

  return (
    <Section>
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-bg-secondary border border-border-default p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-territory-db/5 via-transparent to-accent-teal/5 pointer-events-none" />

          <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
            {/* Text */}
            <div className="flex flex-col gap-4">
              <Overline>{t('overline')}</Overline>
              <h2 className="font-serif text-h2 text-fg-primary">{t('heading')}</h2>
              <p className="text-base text-fg-secondary leading-relaxed">
                {t('description')}
              </p>
              <div className="mt-2">
                <Link href="/learn">
                  <Button variant="primary">{t('cta')}</Button>
                </Link>
              </div>
            </div>

            {/* Feature icons */}
            <div className="flex flex-col gap-6">
              {featureKeys.map((key) => {
                const Icon = featureIcons[key];
                return (
                  <div key={key} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-teal-subtle">
                      <Icon size={18} className="text-accent-teal" />
                    </div>
                    <p className="text-sm text-fg-secondary leading-relaxed pt-2">
                      {t(`features.${key}`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
