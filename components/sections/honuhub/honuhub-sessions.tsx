'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Button, Card } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { Sparkles, Calendar, Coffee, Users, ArrowRight } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

const eventKeys = ['grand_opening', 'ai_workshop', 'community_meetup', 'corporate_intro'] as const;

const eventIcons: Record<typeof eventKeys[number], LucideIcon> = {
  grand_opening: Sparkles,
  ai_workshop: Calendar,
  community_meetup: Coffee,
  corporate_intro: Users,
};

const eventAccents: Record<typeof eventKeys[number], string> = {
  grand_opening: 'var(--accent-gold)',
  ai_workshop: 'var(--accent-teal)',
  community_meetup: 'var(--territory-pro)',
  corporate_intro: 'var(--territory-db)',
};

export function HonuHubSessions() {
  const t = useTranslations('honuhub_page.sessions');

  return (
    <Section>
      <Container size="wide">
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {eventKeys.map((key) => {
            const Icon = eventIcons[key];
            const accent = eventAccents[key];
            return (
              <Card key={key} padding="md" hover className="relative overflow-hidden">
                {/* Left accent bar */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-1"
                  style={{ backgroundColor: accent }}
                />
                <div className="pl-3">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}
                    >
                      <Icon size={18} style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide mb-0.5">
                        {t(`events.${key}.date`)}
                      </p>
                      <h3 className="text-base font-medium text-fg-primary leading-snug">
                        {t(`events.${key}.title`)}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-fg-secondary leading-relaxed">
                    {t(`events.${key}.description`)}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-fg-tertiary">
                    <span>{t(`events.${key}.type`)}</span>
                    <span>{t(`events.${key}.time`)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/learn">
            <Button variant="ghost" icon={ArrowRight} iconPosition="right">
              {t('all_courses')}
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
