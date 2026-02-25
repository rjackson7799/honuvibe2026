'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card } from '@/components/ui';
import { Heart, Handshake, Users, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const principleKeys = ['give_generously', 'pro_bono', 'celebrate_community', 'never_fear'] as const;

const principleConfig: Record<typeof principleKeys[number], { icon: LucideIcon; accent: string }> = {
  give_generously: { icon: Heart, accent: 'var(--accent-teal)' },
  pro_bono: { icon: Handshake, accent: 'var(--accent-gold)' },
  celebrate_community: { icon: Users, accent: 'var(--territory-pro)' },
  never_fear: { icon: Shield, accent: 'var(--territory-db)' },
};

export function AboutAlohaStandard() {
  const t = useTranslations('about_page.aloha_standard');

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
          {principleKeys.map((key) => {
            const { icon: Icon, accent } = principleConfig[key];
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
                      {t(`principles.${key}.title`)}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-fg-secondary">
                    {t(`principles.${key}.description`)}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
