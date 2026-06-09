import type { Metadata } from 'next';
import { PageHead } from '@/components/marketing/studio/page-head';
import { TierGrid } from '@/components/marketing/studio/service-tiers';
import { CtaBand } from '@/components/marketing/studio/cta-band';
import { Check } from '@/components/marketing/studio/studio-icons';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Transparent build prices and monthly care plans for HonuVibe Studio — from $500 Starter sites to custom AI-Native systems.',
};

const CARE_TERMS = [
  '6-month minimum on Starter and Pro care plans.',
  '12-month minimum on AI-Native care.',
  'Pay annually up front and save 10%.',
  'Care covers hosting, monitoring, updates, and support.',
];

export default function PricingPage() {
  return (
    <>
      <PageHead
        crumb="Pricing"
        title={
          <>
            Clear prices. <em>No surprises.</em>
          </>
        }
        lede="A one-time build, then a simple monthly care plan that keeps your site fast, fresh, and improving."
      />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <TierGrid />

          <div className="next-card" style={{ marginTop: 48, maxWidth: 720 }}>
            <h3>How care plans work</h3>
            <ul className="t-feats" style={{ marginBottom: 0 }}>
              {CARE_TERMS.map((t) => (
                <li key={t}>
                  <Check />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
