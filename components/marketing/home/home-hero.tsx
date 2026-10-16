import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { HvButton, HvContainer, HvEyebrow, HvHeading, HvRotatingWord } from '@/components/marketing/hv';
import { HomePathTabs, type HomePath, type HomePathTab } from './home-path-tabs';
import type { HomeLesson, HomeProofQuote } from './lessons';

type Props = {
  /** Lesson titles for the "New in the Vault" rotator; empty hides the row. */
  rotator: readonly HomeLesson[];
  /** A real testimonial (D3); null falls back to the lesson-count line. */
  proofQuote: HomeProofQuote | null;
  lessonCount: number;
  defaultTab: HomePath;
  panels: Record<HomePath, ReactNode>;
};

/** Design 01 Home: dark hero with the rotator, H1, CTAs, proof line and the three-path tabs. */
export function HomeHero({ rotator, proofQuote, lessonCount, defaultTab, panels }: Props) {
  const t = useTranslations('home.hero');
  const tp = useTranslations('home.paths');

  const tabs: HomePathTab[] = (['learn', 'build', 'partner'] as const).map((key) => ({
    key,
    title: tp(`${key}.title`),
    tags: tp.raw(`${key}.tags`) as string[],
  }));

  const proofLine = proofQuote
    ? t('proof_quote', { quote: proofQuote.quote, source: proofQuote.source })
    : lessonCount > 0
      ? t('proof_count', { count: lessonCount })
      : null;

  const intro = (
    <>
      {rotator.length > 0 && (
        <Link
          href="/learn"
          data-intro
          aria-label={`${t('eyebrow')}: ${t('eyebrow_label')}`}
          className="mb-[18px] flex min-h-[44px] flex-col justify-center gap-1 text-hv-sand-100 transition-colors hover:text-hv-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
        >
          <HvEyebrow as="span" tone="amber" dot>
            {t('eyebrow')}
          </HvEyebrow>
          <span className="block h-[2.8em] overflow-hidden text-[15px] font-medium leading-[1.4] sm:h-[1.4em] sm:whitespace-nowrap">
            <HvRotatingWord items={rotator.map((l) => `${l.title} →`)} interval={3200} tone="inherit" />
          </span>
        </Link>
      )}
      <div data-intro>
        <HvHeading level="h1" className="text-hv-sand-100 [word-break:auto-phrase]">
          {t('headline')}
        </HvHeading>
      </div>
      <p data-intro className="mt-4 max-w-[50ch] text-[18px] leading-[1.55] text-hv-green-200">
        {t('lead')}
      </p>
      <div data-intro className="mt-6 flex flex-wrap gap-3">
        <HvButton href="/signup" variant="amber" size="hero" arrow>
          {t('cta_primary')}
        </HvButton>
        <HvButton href="/learn" variant="outline-dark" size="hero">
          {t('cta_secondary')}
        </HvButton>
      </div>
      <p data-intro className="mt-3 text-[14px] text-hv-green-400">
        {t('note')}
      </p>
      {proofLine && (
        <p data-intro data-testid="home-proof-line" className="mt-2 text-[14px] text-hv-green-200">
          {proofLine}
        </p>
      )}
    </>
  );

  return (
    <section className="bg-hv-green-900 pb-14 pt-[112px] text-hv-sand-100">
      <HvContainer className="grid items-stretch gap-11 [grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr))]">
        <HomePathTabs
          defaultTab={defaultTab}
          intro={intro}
          label={tp('label')}
          tablistLabel={tp('tablist_label')}
          tabs={tabs}
          panels={panels}
        />
      </HvContainer>
    </section>
  );
}
