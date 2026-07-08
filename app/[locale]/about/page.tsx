import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  AboutHero,
  AboutOriginStory,
  AboutTeam,
  AboutMissionVision,
  AboutFinalCta,
} from '@/components/marketing/about';
import { ProofBand } from '@/components/marketing/proof-band';
import { getCachedVaultTotalCount } from '@/lib/vault/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const vaultTotalCount = await getCachedVaultTotalCount();

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <AboutHero />
        <ProofBand vaultTotalCount={vaultTotalCount} />
        <AboutOriginStory />
        <AboutTeam />
        <AboutMissionVision />
        <AboutFinalCta />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
