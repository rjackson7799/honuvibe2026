'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { Search, PenTool, Code, Rocket, TrendingUp } from 'lucide-react';

const steps = [
  { num: '01', icon: Search },
  { num: '02', icon: PenTool },
  { num: '03', icon: Code },
  { num: '04', icon: Rocket },
  { num: '05', icon: TrendingUp },
] as const;

export function BuildProcessTimeline() {
  const t = useTranslations('build_page.process');

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

        {/* Desktop: horizontal */}
        <div className="hidden md:grid grid-cols-5 gap-4 relative">
          {/* Connecting line */}
          <div className="absolute top-6 left-[10%] right-[10%] h-px bg-border-default" />

          {steps.map(({ num, icon: Icon }, i) => (
            <div key={num} className="relative flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bg-tertiary border border-border-default flex items-center justify-center relative z-10">
                <Icon size={20} className="text-accent-teal" />
              </div>
              <span className="font-mono text-sm text-accent-teal font-medium">{num}</span>
              <h3 className="font-serif text-base text-fg-primary font-normal">
                {t(`step_${i + 1}_title`)}
              </h3>
              <p className="text-sm text-fg-secondary leading-relaxed">
                {t(`step_${i + 1}_desc`)}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden flex flex-col gap-8 relative pl-12">
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-5 w-px bg-border-default" />

          {steps.map(({ num, icon: Icon }, i) => (
            <div key={num} className="relative">
              <div className="absolute -left-7 top-0 w-10 h-10 rounded-full bg-bg-tertiary border border-border-default flex items-center justify-center">
                <Icon size={16} className="text-accent-teal" />
              </div>
              <span className="font-mono text-sm text-accent-teal font-medium block mb-1">{num}</span>
              <h3 className="font-serif text-base text-fg-primary font-normal mb-1">
                {t(`step_${i + 1}_title`)}
              </h3>
              <p className="text-sm text-fg-secondary leading-relaxed">
                {t(`step_${i + 1}_desc`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
