'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { GlossarySearch } from './GlossarySearch';
import { GlossaryAlphaNav } from './GlossaryAlphaNav';
import { GlossaryTermCard } from './GlossaryTermCard';
import { CtaStrip } from '@/components/sections/cta-strip';
import { trackEvent } from '@/lib/analytics';
import type { GlossaryTermSummary, GlossaryCategory, GlossaryDifficulty } from '@/lib/sanity/types';

type CategoryOption = {
  value: 'all' | GlossaryCategory;
  label: string;
};

type GlossaryIndexContentProps = {
  terms: GlossaryTermSummary[];
  locale: string;
  categoryOptions: CategoryOption[];
  difficultyLabels: Record<GlossaryDifficulty, string>;
  uiStrings: {
    searchPlaceholder: string;
    emptyState: string;
    termCount: string;
  };
  ctaProps: {
    heading: string;
    sub: string;
    ctaText: string;
    ctaHref: string;
  };
};

export function GlossaryIndexContent({
  terms,
  locale,
  categoryOptions,
  difficultyLabels,
  uiStrings,
  ctaProps,
}: GlossaryIndexContentProps) {
  const [filteredTerms, setFilteredTerms] = useState(terms);

  useEffect(() => {
    trackEvent('glossary_view', {
      locale,
      term_count: String(terms.length),
    });
  }, [locale, terms.length]);

  const handleFilteredTermsChange = useCallback((filtered: GlossaryTermSummary[]) => {
    setFilteredTerms(filtered);
  }, []);

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

  const activeLetters = useMemo(
    () => new Set([...grouped.keys()]),
    [grouped],
  );

  return (
    <>
      <div className="mb-4">
        <GlossarySearch
          terms={terms}
          locale={locale}
          onFilteredTermsChange={handleFilteredTermsChange}
          categories={categoryOptions}
          searchPlaceholder={uiStrings.searchPlaceholder}
          emptyState={uiStrings.emptyState}
        />
      </div>

      <p className="text-sm text-fg-tertiary mb-6">
        {uiStrings.termCount}
      </p>

      <GlossaryAlphaNav activeLetters={activeLetters} />

      {filteredTerms.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-fg-tertiary text-base">{uiStrings.emptyState}</p>
        </div>
      ) : (
        <div className="mt-6">
          {[...grouped.entries()].map(([letter, letterTerms]) => (
            <div key={letter} id={`letter-${letter.toLowerCase()}`} className="mb-8">
              <h2 className="font-mono text-sm font-semibold text-accent-teal uppercase tracking-wider mb-2 pt-4">
                {letter}
              </h2>
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
          ))}
        </div>
      )}

      <CtaStrip
        heading={ctaProps.heading}
        sub={ctaProps.sub}
        ctaText={ctaProps.ctaText}
        ctaHref={ctaProps.ctaHref}
      />
    </>
  );
}
