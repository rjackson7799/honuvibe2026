'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { Search, Palette, Code, Rocket, HeartHandshake } from 'lucide-react';

const steps = [
  { key: 'discovery', Icon: Search, color: 'var(--accent-teal)' },
  { key: 'design', Icon: Palette, color: 'var(--accent-gold)' },
  { key: 'build', Icon: Code, color: 'var(--territory-db)' },
  { key: 'launch', Icon: Rocket, color: 'var(--territory-auto)' },
  { key: 'support', Icon: HeartHandshake, color: 'var(--territory-pro)' },
] as const;

export function ProcessTimeline() {
  const t = useTranslations('exploration_page.process');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        {/* Desktop: horizontal timeline */}
        <div className="mt-12 hidden lg:block">
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[10%] right-[10%] top-7 h-[2px] bg-border-default" aria-hidden="true" />

            <div className="relative flex justify-between">
              {steps.map(({ key, Icon, color }, i) => (
                <div key={key} className="relative flex w-[18%] flex-col items-center text-center">
                  {/* Step circle */}
                  <div
                    className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-bg-primary"
                    style={{ borderColor: color }}
                  >
                    <Icon size={22} style={{ color }} />
                  </div>
                  {/* Step number */}
                  <span
                    className="mb-1.5 text-xs font-semibold"
                    style={{ color }}
                  >
                    0{i + 1}
                  </span>
                  <h3 className="mb-2 font-serif text-lg text-fg-primary">
                    {t(`steps.${key}.title`)}
                  </h3>
                  <p className="text-xs text-fg-secondary leading-relaxed">
                    {t(`steps.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet: vertical timeline */}
        <div className="mt-12 lg:hidden">
          <div className="relative pl-10">
            {/* Vertical connecting line */}
            <div
              className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-border-default"
              aria-hidden="true"
            />

            <div className="flex flex-col gap-8">
              {steps.map(({ key, Icon, color }, i) => (
                <div key={key} className="relative flex gap-4">
                  {/* Step circle (positioned over the line) */}
                  <div
                    className="absolute -left-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 bg-bg-primary"
                    style={{ borderColor: color, top: '2px' }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color }}>0{i + 1}</span>
                      <h3 className="font-serif text-base text-fg-primary">
                        {t(`steps.${key}.title`)}
                      </h3>
                    </div>
                    <p className="text-sm text-fg-secondary leading-relaxed">
                      {t(`steps.${key}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
