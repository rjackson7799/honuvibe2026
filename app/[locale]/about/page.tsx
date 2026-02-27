import { setRequestLocale } from 'next-intl/server';
import { AboutHero } from '@/components/sections/about/about-hero';
import { AboutMission } from '@/components/sections/about/about-mission';
import { AboutAlohaStandard } from '@/components/sections/about/about-aloha-standard';
import { AboutCompetencies } from '@/components/sections/about/about-competencies';
// import { AboutFounder } from '@/components/sections/about/about-founder'; // Hidden until ready
import { AboutSocial } from '@/components/sections/about/about-social';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <AboutHero />
      <AboutMission />
      <AboutAlohaStandard />
      <AboutCompetencies />
      {/* <AboutFounder /> */}
      <AboutSocial />
    </>
  );
}
