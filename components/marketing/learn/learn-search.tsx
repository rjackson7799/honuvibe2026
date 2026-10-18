'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { HvButton, HvEyebrow } from '@/components/marketing/hv';
import { setCatalogState, useCatalogState } from './catalog-state';

type HotChip = { label: string; query: string };

/** Hero search + "Hot" chips. Both write the shared filter state and scroll to #catalog. */
export function LearnSearch() {
  const t = useTranslations('learn_catalog.hero');
  const { query } = useCatalogState();
  const [text, setText] = useState(query);
  // Follow the store when something else changes the query (hot chip, Clear
  // filters, the ?q= read after hydration) without an effect.
  const [seen, setSeen] = useState(query);
  if (seen !== query) {
    setSeen(query);
    setText(query);
  }

  const chips = (t.raw('hot_chips') as HotChip[]) ?? [];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCatalogState({ query: text }, { scroll: true });
  }

  return (
    <>
      <form
        role="search"
        onSubmit={onSubmit}
        className="mt-[26px] flex min-h-[60px] max-w-[560px] items-center gap-3 rounded-[12px] border-[1.5px] border-hv-green-700 bg-hv-green-800 pl-[18px] pr-2 transition-colors focus-within:border-hv-amber"
      >
        <span aria-hidden className="text-[18px] text-hv-green-400">
          ⌕
        </span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('search_placeholder')}
          aria-label={t('search_label')}
          className="min-h-[56px] min-w-0 flex-1 bg-transparent text-[17px] text-hv-sand-100 outline-none placeholder:text-hv-green-400"
        />
        <HvButton type="submit" variant="amber" size="sm">
          {t('search_button')}
        </HvButton>
      </form>
      {chips.length > 0 && (
        <div className="mt-[18px] flex flex-wrap items-center gap-2">
          <HvEyebrow as="span" tone="amber" dot className="mr-1">
            {t('hot_label')}
          </HvEyebrow>
          {chips.map((chip) => (
            <button
              key={chip.query}
              type="button"
              onClick={() => setCatalogState({ query: chip.query, track: 'all' }, { scroll: true })}
              className="min-h-[44px] rounded-full border border-hv-green-700 bg-transparent px-[14px] text-[14px] text-hv-sand-100 transition-colors hover:border-hv-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
