import { setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  HomeHero,
  HomeHowItWorks,
  HomeValueProps,
  HomeVaultSection,
  HomeFeaturedCourses,
  HomeOrgSection,
  HomeExploration,
  HomeTestimonials,
} from '@/components/marketing/home';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingShell>
      <MarketingNav showGetStarted />
      <main>
        <HomeHero />
        <HomeHowItWorks />
        <HomeValueProps />
        <HomeVaultSection />
        <HomeFeaturedCourses />
        <HomeOrgSection />
        <HomeExploration />
        <HomeTestimonials />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
