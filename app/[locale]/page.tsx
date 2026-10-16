import { setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { HvReveal } from '@/components/marketing/hv';
import {
  HomeHero,
  HomeHowLearn,
  HomeMoreWays,
  HomePanelBuild,
  HomePanelLearn,
  HomePanelPartner,
  HomePricing,
  pickHomeLessons,
  toHomeProofQuote,
  type HomePath,
} from '@/components/marketing/home';
import { RecoveryHashRedirect } from '@/components/auth/RecoveryHashRedirect';
import { getPublicCatalog } from '@/lib/vault/catalog';
import { getCachedVaultTotalCount } from '@/lib/vault/queries';
import { getPublishedTestimonials } from '@/lib/proof/queries';
import { studioFromPrice } from '@/lib/pricing';

// The design's tweakable props (docs/design_2026_green/pages/01 Home.dc.html).
const SHOW_PRICES = true;
const DEFAULT_TAB: HomePath = 'learn';
const ANIMATE_HERO = true;
const SCROLL_REVEAL = true;

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Home (redesign Unit 1). Every read here is cached and cookie-less so the
 * page prerenders: never call the cookie-bound Supabase client from this tree
 * (__tests__/marketing/home/home-static-guard.test.ts).
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [catalog, lessonCount, testimonials] = await Promise.all([
    getPublicCatalog(),
    getCachedVaultTotalCount(),
    getPublishedTestimonials(1),
  ]);
  const { rotator, recent } = pickHomeLessons(catalog, locale);
  const proofQuote = toHomeProofQuote(testimonials[0], locale);
  const studioPrice = `$${studioFromPrice().toLocaleString('en-US')}`;

  return (
    <MarketingShell theme="hv">
      <RecoveryHashRedirect locale={locale} />
      <MarketingNav />
      <main>
        <HomeHero
          rotator={rotator}
          proofQuote={proofQuote}
          lessonCount={lessonCount}
          defaultTab={DEFAULT_TAB}
          panels={{
            learn: <HomePanelLearn recent={recent} />,
            build: <HomePanelBuild price={studioPrice} showPrice={SHOW_PRICES} />,
            partner: <HomePanelPartner />,
          }}
        />
        <HomeHowLearn />
        <HomeMoreWays price={studioPrice} showPrice={SHOW_PRICES} />
        <HomePricing showPrices={SHOW_PRICES} />
      </main>
      <MarketingNewsletter source="home" />
      <MarketingFooter />
      <HvReveal animateHero={ANIMATE_HERO} scrollReveal={SCROLL_REVEAL} />
    </MarketingShell>
  );
}
