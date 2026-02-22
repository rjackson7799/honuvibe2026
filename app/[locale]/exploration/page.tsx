import { setRequestLocale } from 'next-intl/server';
import { ExplorationHero } from '@/components/sections/exploration/exploration-hero';
import { TerritoryList } from '@/components/sections/exploration/territory-list';
import { ExplorationCta } from '@/components/sections/exploration/exploration-cta';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ExplorationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <ExplorationHero />
      <TerritoryList />
      <ExplorationCta />
    </>
  );
}
