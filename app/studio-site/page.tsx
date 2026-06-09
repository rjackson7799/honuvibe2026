import { HomeHero } from '@/components/marketing/studio/home-hero';
import { FeaturedWork } from '@/components/marketing/studio/featured-work';
import { ServiceTiers } from '@/components/marketing/studio/service-tiers';
import { IndustriesStrip } from '@/components/marketing/studio/industries-strip';
import { ProcessSteps } from '@/components/marketing/studio/process-steps';
import { CtaBand } from '@/components/marketing/studio/cta-band';

export default function StudioHomePage() {
  return (
    <>
      <HomeHero />
      <FeaturedWork />
      <ServiceTiers />
      <IndustriesStrip />
      <ProcessSteps />
      <CtaBand />
    </>
  );
}
