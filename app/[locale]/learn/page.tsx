import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { HvReveal, type Testimonial } from '@/components/marketing/hv';
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
import { getPublishedTestimonials } from '@/lib/proof/queries';
import type { PublicProofArtifact } from '@/lib/proof/types';

// The design's tweakable props (docs/design_2026_green/pages/02 Learn - Catalog.dc.html).
const ANIMATE_HERO = true;
const SCROLL_REVEAL = true;
const HOT_TOPIC_COUNT = 4;
// Roadmap decision 11: real quotes only once three exist, else the site's i18n testimonials.
const MIN_REAL_QUOTES = 3;

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

function toQuote(proof: PublicProofArtifact, locale: string): Testimonial | null {
  const text = (locale === 'ja' && proof.quote_jp?.trim() ? proof.quote_jp : proof.quote_en)?.trim();
  const name = proof.person_name?.trim();
  const role = (locale === 'ja' && proof.role_jp?.trim() ? proof.role_jp : proof.role_en)?.trim();
  const org = [role, proof.org?.trim()].filter(Boolean).join(locale === 'ja' ? '、' : ', ');
  return text && name ? { text, name, org } : null;
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

  const [items, courses, proof] = await Promise.all([
    getPublicCatalog(),
    getPublicCourseCatalog(),
    getPublishedTestimonials(MIN_REAL_QUOTES),
  ]);
  const entries = buildLearnCatalog(items, courses, locale === 'ja' ? 'ja' : 'en');
  const freeFeature = pickFreeFeature(entries);

  const realQuotes = proof.map((p) => toQuote(p, locale)).filter((q): q is Testimonial => q !== null);
  const tq = await getTranslations({ locale, namespace: 'social_proof.testimonials' });
  const quotes =
    realQuotes.length >= MIN_REAL_QUOTES
      ? realQuotes
      : (['two', 'one', 'three'] as const).map((k) => ({
          text: tq(`${k}.quote`),
          name: tq(`${k}.name`),
          org: tq(`${k}.role`),
        }));

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
