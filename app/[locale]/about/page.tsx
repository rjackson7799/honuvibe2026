import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  AboutHero,
  AboutOriginStory,
  AboutTeam,
  AboutAlohaStandard,
  AboutMissionVision,
  AboutSocialSection,
  AboutSoftCta,
} from '@/components/marketing/about';

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

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <AboutHero />
        <AboutOriginStory />
        <AboutTeam />
        <AboutAlohaStandard />
        <AboutMissionVision />
        <AboutSocialSection />
        <AboutSoftCta />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
