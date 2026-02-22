import { setRequestLocale } from 'next-intl/server';
import {
  HeroSection,
  MissionStrip,
  HonuHubFeature,
  FeaturedCourses,
  ExplorationPreview,
  RyanBioStrip,
  NewsletterSignup,
  SocialProof,
} from '@/components/sections';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <MissionStrip />
      <HonuHubFeature />
      <FeaturedCourses />
      <ExplorationPreview />
      <RyanBioStrip />
      <NewsletterSignup />
      <SocialProof />
    </>
  );
}
