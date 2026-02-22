import { setRequestLocale } from 'next-intl/server';
import { CommunityHero } from '@/components/sections/community/community-hero';
import { CommunityAbout } from '@/components/sections/community/community-about';
import { CommunityStories } from '@/components/sections/community/community-stories';
import { CommunityImpact } from '@/components/sections/community/community-impact';
import { CommunityProbono } from '@/components/sections/community/community-probono';
import { CommunityTiers } from '@/components/sections/community/community-tiers';
import { CommunityCta } from '@/components/sections/community/community-cta';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <CommunityHero />
      <CommunityAbout />
      <CommunityStories />
      <CommunityImpact />
      <CommunityProbono />
      <CommunityTiers />
      <CommunityCta />
    </>
  );
}
