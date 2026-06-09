import type { Metadata } from 'next';
import { PageHead } from '@/components/marketing/studio/page-head';
import { WORK, WorkCard } from '@/components/marketing/studio/featured-work';
import { CtaBand } from '@/components/marketing/studio/cta-band';

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Selected AI-native builds from HonuVibe Studio — case studies with real results across creator, healthcare, and in-house projects.',
};

export default function WorkPage() {
  return (
    <>
      <PageHead
        crumb="Work"
        title={
          <>
            Proof you can <em>click through.</em>
          </>
        }
        lede="A slice of what AI-native looks like in production — built by the people teaching AI."
      />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="work-grid" style={{ marginTop: 0 }}>
            {WORK.map((item) => (
              <WorkCard key={item.slug} item={item} />
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
