import { setRequestLocale } from 'next-intl/server';
import {
  ExplorationHero,
  FeaturedBuild,
  TechStackShowcase,
  ProcessTimeline,
  TerritoryGrid,
  ExplorationCta,
} from '@/components/sections/exploration';

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
      <TechStackShowcase />
      <ProcessTimeline />
      <TerritoryGrid />
      <ExplorationCta />
    </>
  );
}
