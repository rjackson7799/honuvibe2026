import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead } from '@/components/marketing/studio/page-head';
import { CtaBand } from '@/components/marketing/studio/cta-band';
import { Check, ArrowRight } from '@/components/marketing/studio/studio-icons';

export const metadata: Metadata = {
  title: 'For Creators',
  description:
    'HonuVibe Studio builds archives, drops, memberships, and storefronts that turn a creator audience into a business.',
};

const OFFERS = [
  'Archives & catalogs made searchable and shoppable',
  'Drops, pre-orders, and limited releases',
  'Memberships and gated content',
  'Print & product storefronts with checkout',
  'An on-page AI assistant for your audience',
  'A content engine that keeps the site alive',
];

export default function CreatorIndustryPage() {
  return (
    <>
      <PageHead
        crumb="Industries / Creators"
        title={
          <>
            Turn an audience into <em>a business.</em>
          </>
        }
        lede="Our launch focus. We build the systems creators need to sell, not just to post — anchored by work like the Kwame Brathwaite Archive."
      />

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="sec-head reveal">
            <span className="eyebrow">What we build for creators</span>
            <h2>Everything your audience needs to buy.</h2>
          </div>
          <ul className="t-feats" style={{ maxWidth: 720, marginTop: 22 }}>
            {OFFERS.map((o) => (
              <li key={o}>
                <Check />
                {o}
              </li>
            ))}
          </ul>

          <p style={{ marginTop: 40 }}>
            <Link href="/work/kwame-brathwaite" className="link-arrow" style={{ display: 'inline-flex' }}>
              See the Kwame Brathwaite Archive case study
              <ArrowRight />
            </Link>
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
