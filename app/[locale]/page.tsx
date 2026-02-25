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
      {/* Fade bridge: smooth dark→light transition in light mode */}
      <div className="light-zone-fade">
        <MissionStrip />
      </div>
      <div className="dark-zone">
        <hr className="glow-divider max-w-[1100px] mx-auto" aria-hidden="true" />
      </div>
      <HonuHubFeature />
      <FeaturedCourses />
      <div className="dark-zone">
        <hr className="glow-divider max-w-[1100px] mx-auto" aria-hidden="true" />
      </div>
      <ExplorationPreview />
      <RyanBioStrip />
      <div className="dark-zone">
        <hr className="glow-divider max-w-[1100px] mx-auto" aria-hidden="true" />
      </div>
      <NewsletterSignup />
      <SocialProof />
    </>
  );
}
