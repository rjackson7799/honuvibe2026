'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { techItems } from '@/lib/tech-items';
import { TechIcon } from '@/components/sections/exploration/tech-icon';

export function TechLogoGrid() {
  const t = useTranslations('build_page.tech');

  const featured = techItems.filter((item) => item.tier === 'featured');
  const aiTier = techItems.filter((item) => item.tier === 'ai');
  const infraTier = techItems.filter((item) => item.tier === 'infra');

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

        {/* Featured: Claude */}
        {featured.map((item) => (
          <div
            key={item.key}
            className="mx-auto mb-10 flex max-w-md items-center justify-center gap-4 rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-5 shadow-[0_0_20px_rgba(182,141,64,0.1)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-gold/15 shadow-[0_0_12px_var(--glow-gold)]">
              <TechIcon name={item.key} size={48} />
            </div>
            <div>
              <p className="text-base font-medium text-fg-primary">{item.label}</p>
              <p className="text-sm text-fg-tertiary">{t('claude_tagline')}</p>
            </div>
          </div>
        ))}

        {/* AI & Development tier */}
        <div className="mb-8">
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-accent-teal">
            {t('tier_ai')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-10">
            {aiTier.map((item) => (
              <div
                key={item.key}
                className="group flex flex-col items-center gap-2 opacity-70 transition-opacity duration-[var(--duration-normal)] hover:opacity-100"
              >
                <div className="flex h-8 w-8 items-center justify-center grayscale transition-[filter] duration-[var(--duration-normal)] group-hover:grayscale-0">
                  <TechIcon name={item.key} size={32} />
                </div>
                <span className="text-xs text-fg-tertiary transition-colors group-hover:text-fg-secondary">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Framework & Infrastructure tier */}
        <div>
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-fg-muted">
            {t('tier_infra')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {infraTier.map((item) => (
              <div
                key={item.key}
                className="group flex flex-col items-center gap-2 transition-opacity duration-[var(--duration-normal)] hover:opacity-100"
              >
                <div className="flex h-7 w-7 items-center justify-center opacity-50 grayscale transition-all duration-[var(--duration-normal)] group-hover:opacity-100 group-hover:grayscale-0">
                  <TechIcon name={item.key} size={28} />
                </div>
                <span className="text-[11px] text-fg-tertiary transition-colors group-hover:text-fg-secondary">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
