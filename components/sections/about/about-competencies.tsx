'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { Cpu, Layers, Puzzle, GraduationCap, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const competencyKeys = ['prototyping', 'micro_saas', 'integration', 'education'] as const;

const competencyConfig: Record<typeof competencyKeys[number], { icon: LucideIcon; accent: string }> = {
  prototyping: { icon: Cpu, accent: 'var(--accent-teal)' },
  micro_saas: { icon: Layers, accent: 'var(--accent-gold)' },
  integration: { icon: Puzzle, accent: 'var(--territory-web)' },
  education: { icon: GraduationCap, accent: 'var(--territory-pro)' },
};

export function AboutCompetencies() {
  const t = useTranslations('about_page.competencies');

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {competencyKeys.map((key) => {
            const { icon: Icon, accent } = competencyConfig[key];
            return (
              <Card key={key} padding="md" hover className="relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 top-0 w-1"
                  style={{ backgroundColor: accent }}
                />
                <div className="pl-3">
                  <div className="mb-3 flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}
                    >
                      <Icon size={18} style={{ color: accent }} />
                    </div>
                    <h3 className="min-w-0 flex-1 text-base font-medium leading-snug text-fg-primary pt-2">
                      {t(`items.${key}.title`)}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-fg-secondary">
                    {t(`items.${key}.description`)}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Consulting CTA */}
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-border-default bg-bg-secondary p-8 text-center md:p-12">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-gold/5 via-transparent to-accent-teal/5" />
          <div className="relative flex flex-col items-center gap-4">
            <h3 className="font-serif text-h3 text-fg-primary">{t('cta_heading')}</h3>
            <p className="max-w-[480px] text-base leading-relaxed text-fg-secondary">
              {t('cta_description')}
            </p>
            <div className="mt-2">
              <Link href="/contact">
                <Button variant="gold" size="lg" icon={ArrowRight} iconPosition="right">
                  {t('cta_button')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
