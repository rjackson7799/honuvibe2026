'use client';

import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading, Card, Tag } from '@/components/ui';
import { Globe, Database, Rocket, Zap, Heart } from 'lucide-react';

const territories = [
  { key: 'web', Icon: Globe, color: 'var(--territory-web)', projects: ['reef_dashboard', 'island_eats'] },
  { key: 'db', Icon: Database, color: 'var(--territory-db)', projects: ['aloha_scheduler', 'inventory_pro'] },
  { key: 'saas', Icon: Rocket, color: 'var(--territory-saas)', projects: ['course_pilot'] },
  { key: 'auto', Icon: Zap, color: 'var(--territory-auto)', projects: ['report_flow'] },
  { key: 'pro', Icon: Heart, color: 'var(--territory-pro)', projects: ['coral_watch'] },
] as const;

export function TerritoryGrid() {
  const t = useTranslations('exploration_page.territories');
  const th = useTranslations('exploration_page.territory_grid');

  return (
    <Section>
      <Container size="wide">
        <SectionHeading
          overline={th('overline')}
          heading={th('heading')}
          sub={th('sub')}
          centered
        />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {territories.map(({ key, Icon, color, projects }) => {
            // Collect all unique tags from projects
            const allTags = new Set<string>();
            projects.forEach((p) => {
              t(`${key}.projects.${p}.tags`).split(',').forEach((tag) => allTags.add(tag.trim()));
            });

            return (
              <Card key={key} padding="lg" hover className="relative overflow-hidden">
                {/* Top accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: color }}
                />
                <div className="pt-2">
                  {/* Icon */}
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    <Icon size={22} style={{ color }} />
                  </div>

                  {/* Title & description */}
                  <h3 className="mb-2 font-serif text-h3 text-fg-primary">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="mb-4 text-sm text-fg-secondary leading-relaxed">
                    {t(`${key}.description`)}
                  </p>

                  {/* Project list */}
                  <div className="mb-4 space-y-2">
                    {projects.map((projectKey) => (
                      <div key={projectKey} className="flex items-start gap-2">
                        <div
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-fg-primary">
                            {t(`${key}.projects.${projectKey}.title`)}
                          </p>
                          <p className="text-xs text-accent-gold">
                            {t(`${key}.projects.${projectKey}.outcome`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(allTags).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
