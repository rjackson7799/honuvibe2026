import { useTranslations } from 'next-intl';
import { HvBreadcrumb, HvContainer, HvHeading, HvRotatingWord } from '@/components/marketing/hv';
import type { LearnCatalogEntry } from '@/lib/learn/catalog';
import { LearnFreeCard } from './learn-free-card';
import { LearnSearch } from './learn-search';

/** Design 02 hero: breadcrumb, H1, rotator line, lead, search + hot chips, free lesson card. */
export function LearnHero({ freeFeature }: { freeFeature: LearnCatalogEntry | null }) {
  const t = useTranslations('learn_catalog.hero');

  return (
    <section className="bg-hv-green-900 pb-[60px] pt-[108px] text-hv-sand-100">
      <HvContainer className="grid items-center gap-11 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
        <div className="min-w-0">
          <div data-intro>
            <HvBreadcrumb
              items={[{ label: t('breadcrumb_home'), href: '/' }, { label: t('breadcrumb_learn') }]}
            />
          </div>
          <div data-intro>
            <HvHeading level="h1-lg" className="mt-[18px] text-hv-sand-100 [word-break:auto-phrase]">
              {t('title')}
            </HvHeading>
          </div>
          {/* Fixed height for up to three lines on phones / two on wider screens so swaps never shift the layout. */}
          <p
            data-intro
            className="mt-4 min-h-[3.6em] font-hv-display text-[clamp(20px,2.2vw,28px)] font-semibold leading-[1.2] tracking-[-0.02em] text-hv-green-200 sm:min-h-[2.4em]"
          >
            {t('rotator_prefix')} <HvRotatingWord items={t.raw('rotator_items') as string[]} interval={2800} />
          </p>
          <p data-intro className="mt-3 max-w-[50ch] text-[17px] leading-[1.6] text-hv-green-200">
            {t('lead')}
          </p>
          <div data-intro>
            <LearnSearch />
          </div>
        </div>
        <LearnFreeCard entry={freeFeature} />
      </HvContainer>
    </section>
  );
}
