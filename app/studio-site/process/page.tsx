import type { Metadata } from 'next';
import { PageHead } from '@/components/marketing/studio/page-head';
import { ProcessSteps } from '@/components/marketing/studio/process-steps';
import { CtaBand } from '@/components/marketing/studio/cta-band';

export const metadata: Metadata = {
  title: 'Process',
  description:
    'How HonuVibe Studio builds — a calm, four-step rhythm from discovery to launch, with you live in weeks, not quarters.',
};

export default function ProcessPage() {
  return (
    <>
      <PageHead
        crumb="Process"
        title={
          <>
            A calm way to <em>ship fast.</em>
          </>
        }
        lede="You always know what's next. Four steps, real prototypes, and a launch measured in weeks."
      />
      <ProcessSteps />
      <CtaBand />
    </>
  );
}
