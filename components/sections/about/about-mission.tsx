'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';

export function AboutMission() {
  const t = useTranslations('about_page.mission');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('description')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Mission card */}
          <div className="relative overflow-hidden rounded-2xl border border-border-default bg-bg-secondary p-8">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-teal/5 via-transparent to-transparent" />
            <div className="relative">
              <div className="mb-6 h-1 w-12 rounded-full bg-accent-teal" />
              <h3 className="mb-4 font-serif text-h3 text-fg-primary">{t('mission_title')}</h3>
              <p className="text-base leading-relaxed text-fg-secondary">{t('mission_text')}</p>
            </div>
          </div>

          {/* Vision card */}
          <div className="relative overflow-hidden rounded-2xl border border-border-default bg-bg-secondary p-8">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-gold/5 via-transparent to-transparent" />
            <div className="relative">
              <div className="mb-6 h-1 w-12 rounded-full bg-accent-gold" />
              <h3 className="mb-4 font-serif text-h3 text-fg-primary">{t('vision_title')}</h3>
              <p className="text-base leading-relaxed text-fg-secondary">{t('vision_text')}</p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
