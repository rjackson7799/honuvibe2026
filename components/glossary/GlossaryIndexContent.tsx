'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Briefcase,
  Cpu,
  LayoutGrid,
  Lightbulb,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '@/components/marketing/primitives/section';
import { Container } from '@/components/marketing/primitives/container';
import { Overline } from '@/components/marketing/primitives/overline';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';
import { Button } from '@/components/marketing/primitives/button';
import { GlossarySearch } from './GlossarySearch';
import { GlossaryAlphaNav } from './GlossaryAlphaNav';
import { GlossaryTermCard } from './GlossaryTermCard';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import type {
  GlossaryTermSummary,
  GlossaryCategory,
  GlossaryDifficulty,
} from '@/lib/sanity/types';

type CategoryValue = 'all' | GlossaryCategory;

type CategoryChip = {
  value: CategoryValue;
  labelKey:
    | 'filter_all'
    | 'filter_core'
    | 'filter_models'
    | 'filter_tools'
    | 'filter_business';
  Icon: LucideIcon;
};

const CATEGORY_CHIPS: CategoryChip[] = [
  { value: 'all', labelKey: 'filter_all', Icon: LayoutGrid },
  { value: 'core-concepts', labelKey: 'filter_core', Icon: Lightbulb },
  { value: 'models-architecture', labelKey: 'filter_models', Icon: Cpu },
  { value: 'tools-platforms', labelKey: 'filter_tools', Icon: Wrench },
  { value: 'business-strategy', labelKey: 'filter_business', Icon: Briefcase },
];

type GlossaryIndexContentProps = {
  terms: GlossaryTermSummary[];
};

export function GlossaryIndexContent({ terms }: GlossaryIndexContentProps) {
  const t = useTranslations('glossary');
  const locale = useLocale();
  const isEn = locale === 'en';

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryValue>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    trackEvent('glossary_view', {
      locale,
      term_count: String(terms.length),
    });
  }, [locale, terms.length]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredTerms = useMemo(() => {
    const lower = debouncedQuery.toLowerCase().trim();
    return terms.filter((term) => {
      if (activeCategory !== 'all' && term.category !== activeCategory) return false;
      if (!lower) return true;
      return (
        term.term_en.toLowerCase().includes(lower) ||
        (term.term_jp?.toLowerCase().includes(lower) ?? false) ||
        (term.abbreviation?.toLowerCase().includes(lower) ?? false) ||
        (term.reading_jp?.toLowerCase().includes(lower) ?? false) ||
        term.definition_short_en.toLowerCase().includes(lower) ||
        (term.definition_short_jp?.toLowerCase().includes(lower) ?? false)
      );
    });
  }, [terms, debouncedQuery, activeCategory]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      trackEvent('glossary_search', {
        search_query: debouncedQuery.trim(),
        results_count: String(filteredTerms.length),
        locale,
      });
    }
  }, [debouncedQuery, filteredTerms.length, locale]);

  const handleCategoryChange = useCallback(
    (value: CategoryValue) => {
      setActiveCategory(value);
      trackEvent('glossary_filter', { category: value, locale });
    },
    [locale],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTermSummary[]>();
    filteredTerms.forEach((term) => {
      const firstChar = (term.abbreviation || term.term_en)[0]?.toUpperCase() || '#';
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(term);
    });
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [filteredTerms]);

  const activeLetters = useMemo(() => new Set([...grouped.keys()]), [grouped]);

  const difficultyLabels: Record<GlossaryDifficulty, string> = {
    beginner: t('difficulty_beginner'),
    intermediate: t('difficulty_intermediate'),
    advanced: t('difficulty_advanced'),
  };

  return (
    <>
      <Section variant="canvas" spacing="hero">
        <Container>
          <div className="mx-auto max-w-[720px] text-center">
            <Overline tone="coral" className="mb-3.5">
              {t('overline')}
            </Overline>
            <SectionHeading className="mb-5">
              {t.rich('title', {
                em: (chunks) => (
                  <span
                    className={cn(
                      'text-[var(--m-seafoam)]',
                      isEn && 'italic',
                    )}
                    style={isEn ? { fontFamily: 'var(--font-dm-serif)' } : undefined}
                  >
                    {chunks}
                  </span>
                ),
              })}
            </SectionHeading>
            <p className="text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
              {t('subtitle')}
            </p>

            <ul
              role="list"
              className="mt-10 flex flex-wrap justify-center gap-2.5"
            >
              {CATEGORY_CHIPS.map(({ value, labelKey, Icon }) => {
                const isActive = activeCategory === value;
                return (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => handleCategoryChange(value)}
                      aria-pressed={isActive}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium',
                        'border transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]',
                        isActive
                          ? 'border-[var(--m-accent-teal)] bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal-dark)]'
                          : 'border-[var(--m-border-default)] bg-[var(--m-white)] text-[var(--m-ink-secondary)] hover:border-[var(--m-seafoam)] hover:text-[var(--m-ink-primary)]',
                      )}
                    >
                      <Icon
                        size={16}
                        strokeWidth={2}
                        className={
                          isActive
                            ? 'text-[var(--m-accent-teal)]'
                            : 'text-[var(--m-seafoam)]'
                        }
                      />
                      {t(labelKey)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </Section>

      <Section variant="canvas" spacing="flush" className="pb-16 md:pb-24">
        <Container>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <GlossarySearch
              value={query}
              onChange={setQuery}
              placeholder={t('search_placeholder')}
            />
            <p className="text-[13px] font-medium text-[var(--m-ink-tertiary)]">
              {t('term_count', { count: filteredTerms.length })}
            </p>
          </div>

          <div className="mt-6">
            <GlossaryAlphaNav activeLetters={activeLetters} />
          </div>

          {filteredTerms.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[15px] text-[var(--m-ink-tertiary)]">
                {t('empty_state')}
              </p>
            </div>
          ) : (
            <div className="mt-8">
              {[...grouped.entries()].map(([letter, letterTerms]) => (
                <div
                  key={letter}
                  id={`letter-${letter.toLowerCase()}`}
                  className="mb-10 scroll-mt-[calc(var(--m-nav-h)+72px)]"
                >
                  <h2 className="mb-3 pt-2 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                    {letter}
                  </h2>
                  <div className="rounded-[var(--m-radius-lg)] border border-[var(--m-border-soft)] bg-[var(--m-sand)]/40 px-4 py-2">
                    {letterTerms.map((term) => (
                      <GlossaryTermCard
                        key={term.slug.current}
                        term_en={term.term_en}
                        term_jp={term.term_jp}
                        abbreviation={term.abbreviation}
                        slug={term.slug}
                        definition_short={
                          locale === 'ja' && term.definition_short_jp
                            ? term.definition_short_jp
                            : term.definition_short_en
                        }
                        difficulty={term.difficulty}
                        difficultyLabel={difficultyLabels[term.difficulty]}
                        locale={locale}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>

      <Section variant="sand" spacing="default">
        <Container>
          <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <SectionHeading>{t('cta_heading')}</SectionHeading>
            <p className="text-[16px] leading-[1.65] text-[var(--m-ink-secondary)]">
              {t('cta_sub')}
            </p>
            <div className="mt-2">
              <Button href="/learn" variant="primary-teal" size="lg" withArrow>
                {t('cta_button')}
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
