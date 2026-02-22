'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { Monitor, Wifi, Video } from 'lucide-react';

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
              {[
                { Icon: Wifi, text: 'Live streaming with full interaction' },
                { Icon: Video, text: 'All sessions recorded for later viewing' },
                { Icon: Monitor, text: 'Q&A, polls, and breakout rooms' },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-teal-subtle">
                    <Icon size={18} className="text-accent-teal" />
                  </div>
                  <p className="text-sm text-fg-secondary leading-relaxed pt-2">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
