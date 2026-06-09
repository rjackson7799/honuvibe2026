import type { Metadata } from 'next';
import { PageHead } from '@/components/marketing/studio/page-head';
import { TierGrid } from '@/components/marketing/studio/service-tiers';
import { ProcessSteps } from '@/components/marketing/studio/process-steps';
import { CtaBand } from '@/components/marketing/studio/cta-band';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Three ways to build with HonuVibe Studio — Starter, Pro, and AI-Native — each with ongoing care so your site keeps improving after launch.',
};

export default function ServicesPage() {
  return (
    <>
      <PageHead
        crumb="Services"
        title={
          <>
            Three ways to <em>build with us.</em>
          </>
        }
        lede="Start lean and grow into an AI-native system. Every tier includes ongoing care — your site keeps improving after launch."
      />
      <section className="section svc-wrap" style={{ paddingTop: 48 }}>
        <div className="container">
          <TierGrid />
        </div>
      </section>
      <ProcessSteps />
      <CtaBand />
    </>
  );
}
