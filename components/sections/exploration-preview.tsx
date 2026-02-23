'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Tag, Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

const projectKeys = ['reef_analytics', 'aloha_scheduler'] as const;
const accentColors = ['var(--accent-teal)', 'var(--accent-gold)'];

export function ExplorationPreview() {
  const t = useTranslations('exploration');

  return (
    <Section id="exploration">
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {projectKeys.map((key, i) => {
            const tags = t(`projects.${key}.tags`).split(',');
            return (
              <Card key={key} variant="glass" hover padding="lg" className="relative overflow-hidden">
                {/* Left accent bar */}
                <div
                  className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${i === 0 ? 'accent-bar-teal' : 'accent-bar-gold'}`}
                />

                <div className="pl-4">
                  <h3 className="font-serif text-h3 text-fg-primary mb-2">
                    {t(`projects.${key}.title`)}
                  </h3>
                  <p className="text-sm text-fg-secondary leading-relaxed mb-3">
                    {t(`projects.${key}.tagline`)}
                  </p>
                  <p className="text-sm font-medium text-accent-gold mb-4">
                    {t(`projects.${key}.outcome`)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Tag key={tag}>{tag.trim()}</Tag>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/exploration">
            <Button variant="ghost" icon={ArrowRight} iconPosition="right">
              {t('cta')}
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
