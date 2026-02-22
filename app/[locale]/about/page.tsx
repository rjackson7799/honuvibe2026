import { setRequestLocale } from 'next-intl/server';
import { AboutHero } from '@/components/sections/about/about-hero';
import { AboutStory } from '@/components/sections/about/about-story';
import { AboutPhilosophy } from '@/components/sections/about/about-philosophy';
import { AboutWork } from '@/components/sections/about/about-work';
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
      <AboutStory />
      <AboutPhilosophy />
      <AboutSocial />
      <AboutWork />
    </>
  );
}
