import { setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  HomeHero,
  HomePersonaRouter,
  HomeMembershipBento,
  HomeFeaturedCourses,
  HomeOrgSection,
  HomeFounderNote,
  ProofStories,
  HomeFaq,
  HomeFinalCta,
} from '@/components/marketing/home';
import { ProofBand } from '@/components/marketing/proof-band';
import { RecoveryHashRedirect } from '@/components/auth/RecoveryHashRedirect';
import { getCachedVaultTotalCount } from '@/lib/vault/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const vaultTotalCount = await getCachedVaultTotalCount();

  return (
    <MarketingShell>
      <RecoveryHashRedirect locale={locale} />
      <MarketingNav showGetStarted />
      <main>
        <HomeHero />
        <ProofBand vaultTotalCount={vaultTotalCount} />
        <HomePersonaRouter />
        <HomeMembershipBento />
        <HomeFeaturedCourses />
        <HomeOrgSection />
        <HomeFounderNote />
        <ProofStories />
        <HomeFaq />
        <HomeFinalCta />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
