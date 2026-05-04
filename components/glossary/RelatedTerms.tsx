'use client';

import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { DifficultyBadge } from './DifficultyBadge';
import type { GlossaryTermRef, GlossaryDifficulty } from '@/lib/sanity/types';

type RelatedTermsProps = {
  terms: GlossaryTermRef[];
  locale: string;
  difficultyLabels: Record<GlossaryDifficulty, string>;
  sourceTermSlug: string;
};

export function RelatedTerms({ terms, locale, difficultyLabels, sourceTermSlug }: RelatedTermsProps) {
  if (!terms || terms.length === 0) return null;

  const localePath = locale === 'ja' ? '/ja' : '';

  return (
    <div className="flex flex-wrap gap-2">
      {terms.map((term) => {
        const displayName = term.abbreviation || term.term_en;
        return (
          <a
            key={term.slug.current}
            href={`${localePath}/glossary/${term.slug.current}`}
            onClick={() => {
              trackEvent('glossary_related_click', {
                source_term: sourceTermSlug,
                target_term: term.slug.current,
                locale,
              });
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5',
              'border border-[var(--m-border-default)] bg-[var(--m-white)]',
              'text-[14px] font-medium text-[var(--m-ink-secondary)]',
              'transition-all duration-150',
              'hover:border-[var(--m-accent-teal)] hover:text-[var(--m-accent-teal-dark)] hover:shadow-[var(--m-shadow-xs)]',
            )}
          >
            <span>{displayName}</span>
            <DifficultyBadge
              difficulty={term.difficulty}
              label={difficultyLabels[term.difficulty]}
            />
          </a>
        );
      })}
    </div>
  );
}
