'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { techItems } from '@/lib/tech-items';
import { TechIcon } from '@/components/sections/exploration/tech-icon';

export function TechLogoGrid() {
  const t = useTranslations('build_page.tech');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('headline')}
          sub={t('sub')}
          centered
          className="mb-12"
        />

        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {techItems.map(({ key }) => (
            <div
              key={key}
              className="group flex flex-col items-center gap-2 transition-opacity duration-[var(--duration-normal)] opacity-50 hover:opacity-100"
            >
              <div className="w-8 h-8 flex items-center justify-center grayscale group-hover:grayscale-0 transition-[filter] duration-[var(--duration-normal)]">
                <TechIcon name={key} size={32} />
              </div>
              <span className="text-xs text-fg-tertiary group-hover:text-fg-secondary transition-colors capitalize">
                {key}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
