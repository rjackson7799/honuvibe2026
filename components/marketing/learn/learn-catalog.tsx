'use client';

import { Suspense, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { HvButton, HvContainer, HvEyebrow, HvHeading, HvPillToggle } from '@/components/marketing/hv';
import { filterCatalog, type LearnCatalogEntry } from '@/lib/learn/catalog';
import { TRACK_IDS, type TrackId } from '@/lib/tracks';
import { cn } from '@/lib/utils';
import { CatalogUrlSync, resetCatalogState, setCatalogState, useCatalogState } from './catalog-state';
import { LearnCatalogCard } from './learn-catalog-card';

type Props = {
  entries: LearnCatalogEntry[];
  /** Sidebar rendered beside the grid (sticky on lg). */
  aside?: ReactNode;
};

/** The filterable grid: track chips, free switch, live result count, cards, empty state. */
export function LearnCatalog({ entries, aside }: Props) {
  const t = useTranslations('learn_catalog.catalog');
  const tt = useTranslations('tracks');
  const state = useCatalogState();
  const label = (id: TrackId) => tt(`${id}.label`);

  const visible = filterCatalog(entries, state, label);
  const headline = state.query
    ? t('results_for', { query: state.query })
    : state.track === 'all'
      ? t('all_heading')
      : t('track_heading', { label: label(state.track), blurb: tt(`${state.track}.blurb`) });

  const chips: { id: TrackId | 'all'; text: string }[] = [
    { id: 'all', text: tt('all') },
    ...TRACK_IDS.map((id) => ({ id, text: label(id) })),
  ];

  return (
    <section id="catalog" className="scroll-mt-[88px] pt-[72px]">
      {/* Own boundary: only this null-rendering island skips prerendering. */}
      <Suspense fallback={null}>
        <CatalogUrlSync />
      </Suspense>
      <HvContainer>
        <HvEyebrow>{t('eyebrow')}</HvEyebrow>
        <HvHeading level="h2-sm" className="mt-2.5 text-hv-green-900 [word-break:auto-phrase]">
          {t('title')}
        </HvHeading>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <div role="group" aria-label={t('filter_label')} className="flex flex-wrap gap-2.5">
            {chips.map((chip) => (
              <HvPillToggle
                key={chip.id}
                tone="light"
                active={state.track === chip.id}
                onClick={() => setCatalogState({ track: chip.id })}
                className="px-[18px] text-[15px]"
              >
                {chip.text}
              </HvPillToggle>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.freeOnly}
            onClick={() => setCatalogState({ freeOnly: !state.freeOnly })}
            className="ml-auto inline-flex min-h-[46px] items-center gap-2.5 text-[15px] font-semibold text-hv-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
          >
            <span
              aria-hidden
              className={cn(
                'relative h-6 w-10 rounded-full transition-colors duration-200 motion-reduce:transition-none',
                state.freeOnly ? 'bg-hv-terracotta' : 'bg-hv-sand-400',
              )}
            >
              <span
                className={cn(
                  'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-hv-sand-50 transition-[left] duration-200 motion-reduce:transition-none',
                  state.freeOnly ? 'left-[19px]' : 'left-[3px]',
                )}
              />
            </span>
            {t('free_only')}
          </button>
        </div>

        <div className="mt-[22px] flex flex-wrap items-baseline justify-between gap-3 border-b border-hv-sand-300 pb-3.5">
          <p className="font-hv-display text-[clamp(18px,1.8vw,22px)] font-semibold tracking-[-0.02em] text-hv-green-900 [word-break:auto-phrase]">
            {headline}
          </p>
          <p aria-live="polite" className="text-[14px] text-hv-ink-500">
            {t('count', { count: visible.length })}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-start gap-[26px]">
          <div className="min-w-0 flex-[999_1_560px]">
            {visible.length > 0 ? (
              <ul
                data-testid="learn-grid"
                className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,228px),1fr))]"
              >
                {visible.map((entry) => (
                  <li key={entry.id}>
                    <LearnCatalogCard entry={entry} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-hv-sand-200 p-7 text-[16px] text-hv-ink-700">
                <span>{t('empty')}</span>
                <HvButton variant="outline" size="sm" onClick={() => resetCatalogState()}>
                  {t('clear')}
                </HvButton>
              </div>
            )}
          </div>
          {aside && <aside className="min-w-0 max-w-full flex-[1_1_280px] lg:sticky lg:top-[88px]">{aside}</aside>}
        </div>
      </HvContainer>
    </section>
  );
}
