'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Card, Tag } from '@/components/ui';
import { ChevronDown, Globe, Database, Rocket, Zap, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const territories = [
  { key: 'web', Icon: Globe, color: 'var(--territory-web)', projects: ['reef_dashboard', 'island_eats'] },
  { key: 'db', Icon: Database, color: 'var(--territory-db)', projects: ['aloha_scheduler', 'inventory_pro'] },
  { key: 'saas', Icon: Rocket, color: 'var(--territory-saas)', projects: ['course_pilot'] },
  { key: 'auto', Icon: Zap, color: 'var(--territory-auto)', projects: ['report_flow'] },
  { key: 'pro', Icon: Heart, color: 'var(--territory-pro)', projects: ['coral_watch'] },
] as const;

export function TerritoryList() {
  const t = useTranslations('exploration_page.territories');
  const [openTerritory, setOpenTerritory] = useState<string | null>('web');

  return (
    <Section>
      <Container size="wide">
        <div className="flex flex-col gap-4">
          {territories.map(({ key, Icon, color, projects }) => {
            const isOpen = openTerritory === key;

            return (
              <div key={key} className="rounded-xl border border-border-default overflow-hidden">
                {/* Accordion header */}
                <button
                  onClick={() => setOpenTerritory(isOpen ? null : key)}
                  className="w-full flex items-center gap-4 p-5 md:p-6 bg-bg-secondary hover:bg-bg-tertiary/50 transition-colors duration-[var(--duration-fast)] text-left"
                >
                  {/* Left accent bar */}
                  <div
                    className="w-1 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-lg text-fg-primary">{t(`${key}.title`)}</h3>
                    <p className="text-sm text-fg-secondary mt-0.5 hidden sm:block">{t(`${key}.description`)}</p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={cn(
                      'text-fg-tertiary shrink-0 transition-transform duration-[var(--duration-normal)]',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {/* Accordion content */}
                <div
                  className={cn(
                    'grid transition-all duration-[var(--duration-slow)]',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="p-5 md:p-6 pt-0 grid grid-cols-1 gap-4 md:grid-cols-2">
                      {projects.map((projectKey) => {
                        const tags = t(`${key}.projects.${projectKey}.tags`).split(',');
                        return (
                          <Card key={projectKey} hover padding="md" className="relative overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
                              style={{ backgroundColor: color }}
                            />
                            <div className="pl-3">
                              <h4 className="font-serif text-base text-fg-primary mb-1.5">
                                {t(`${key}.projects.${projectKey}.title`)}
                              </h4>
                              <p className="text-sm text-fg-secondary leading-relaxed mb-2">
                                {t(`${key}.projects.${projectKey}.tagline`)}
                              </p>
                              <p className="text-sm font-medium text-accent-gold mb-3">
                                {t(`${key}.projects.${projectKey}.outcome`)}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                  <Tag key={tag}>{tag.trim()}</Tag>
                                ))}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
