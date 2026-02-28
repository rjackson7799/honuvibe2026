import { setRequestLocale } from 'next-intl/server';
import { AboutHero } from '@/components/sections/about/about-hero';
import { AboutMission } from '@/components/sections/about/about-mission';
import { AboutAlohaStandard } from '@/components/sections/about/about-aloha-standard';
import { AboutCompetencies } from '@/components/sections/about/about-competencies';
// import { AboutFounder } from '@/components/sections/about/about-founder'; // Hidden until ready
import { AboutSocial } from '@/components/sections/about/about-social';
import { AbyssalEchoBackground } from '@/components/ocean/abyssal-echo-background';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Shared background wrapper for hero + mission */}
      <div className="dark-zone relative overflow-hidden">
        <AbyssalEchoBackground />
        <AboutHero />
        <AboutMission />
        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-b from-transparent to-bg-primary pointer-events-none z-10" />
      </div>
      <AboutAlohaStandard />
      <AboutCompetencies />
      {/* <AboutFounder /> */}
      <AboutSocial />
    </>
  );
}
