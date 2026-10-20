import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { HvReveal } from '@/components/marketing/hv';
import {
  LearnCatalog,
  LearnFaq,
  LearnHero,
  LearnHotTopics,
  LearnPricingStrip,
  LearnSidebar,
} from '@/components/marketing/learn';
import { buildLearnCatalog, pickFreeFeature, pickHotTopics } from '@/lib/learn/catalog';
import { getPublicCourseCatalog } from '@/lib/learn/public-courses';
import { getPublicCatalog } from '@/lib/vault/catalog';
import { getPageQuotes } from '@/lib/proof/page-quotes';

// The design's tweakable props (docs/design_2026_green/pages/02 Learn - Catalog.dc.html).
const ANIMATE_HERO = true;
const SCROLL_REVEAL = true;
const HOT_TOPIC_COUNT = 4;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn_catalog.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: locale === 'ja' ? '/ja/learn' : '/learn',
      languages: { en: '/learn', ja: '/ja/learn' },
    },
  };
}

/**
 * Learn catalog (redesign Unit 2a). Every read here is cached and cookie-less
 * and the page never reads `searchParams`, so /learn and /ja/learn prerender;
 * the `?track=&q=&free=1` filters are read on the client after hydration
 * (__tests__/marketing/learn/learn-static-guard.test.ts).
 */
export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [items, courses, quotes] = await Promise.all([
    getPublicCatalog(),
    getPublicCourseCatalog(),
    getPageQuotes(locale),
  ]);
  const entries = buildLearnCatalog(items, courses, locale === 'ja' ? 'ja' : 'en');
  const freeFeature = pickFreeFeature(entries);

  return (
    <MarketingShell theme="hv">
      <MarketingNav />
      <main>
        <LearnHero freeFeature={freeFeature} />
        <LearnHotTopics topics={pickHotTopics(entries, HOT_TOPIC_COUNT)} />
        <LearnCatalog entries={entries} aside={<LearnSidebar />} />
        <LearnFaq quotes={quotes} />
        <LearnPricingStrip freeHref={freeFeature?.href ?? '/signup'} hasFreeLesson={freeFeature !== null} />
      </main>
      <MarketingNewsletter source="learn" />
      <MarketingFooter />
      <HvReveal animateHero={ANIMATE_HERO} scrollReveal={SCROLL_REVEAL} />
    </MarketingShell>
  );
}
