import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  ExploreReelHero,
  ExploreIndex,
  ExploreMethod,
  ExploreAlohaStandard,
  ExploreQuestions,
  ExploreNextIssue,
} from '@/components/marketing/explore';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'explore.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ExplorationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <ExploreReelHero />
        <ExploreIndex />
        <ExploreMethod />
        <ExploreAlohaStandard />
        <ExploreQuestions />
        <ExploreNextIssue />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
