import { setRequestLocale } from 'next-intl/server';
import {
  ExplorationHero,
  FeaturedBuild,
} from '@/components/sections/exploration';
import { ExploreBottomCTA } from '@/components/sections/exploration/explore-bottom-cta';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ExplorationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <ExplorationHero />
      <FeaturedBuild />
      <ExploreBottomCTA />
    </>
  );
}
