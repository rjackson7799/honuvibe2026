import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { WORK } from '@/components/marketing/studio/featured-work';
import { PageHead } from '@/components/marketing/studio/page-head';
import { CtaBand } from '@/components/marketing/studio/cta-band';
import { ArrowRight } from '@/components/marketing/studio/studio-icons';

type CaseDetail = {
  tier: string;
  stats: { n: string; l: string }[];
  challenge: string;
  approach: string[];
  outcome: string;
};

const CASE_DETAILS: Record<string, CaseDetail> = {
  'kwame-brathwaite': {
    tier: 'Studio AI-Native',
    stats: [
      { n: '3.4×', l: 'more inbound leads' },
      { n: '2 wks', l: 'concept → live' },
      { n: '40+', l: 'works catalogued' },
    ],
    challenge:
      'A historic photography archive had a priceless catalog but no way to turn attention into sales. The existing site was a static gallery — beautiful, but a dead end.',
    approach: [
      'Modelled the archive as structured, searchable content with an AI-assisted tagging pass.',
      'Built a print storefront with checkout, wired to the catalog so new works publish in minutes.',
      'Added an on-page assistant that answers provenance and licensing questions in the visitor’s words.',
    ],
    outcome:
      'A living storefront that the team updates themselves. Inbound more than tripled in the first month, with licensing inquiries arriving pre-qualified.',
  },
  hci: {
    tier: 'Studio AI-Native',
    stats: [
      { n: '70%', l: 'less intake time' },
      { n: '0', l: 'new hires' },
      { n: '24/7', l: 'booking' },
    ],
    challenge:
      'Patient intake ran on phone tag and emailed PDFs. Staff spent hours re-keying forms, and patients dropped off before their first appointment.',
    approach: [
      'Designed an AI-assisted intake flow that adapts questions to the patient’s answers.',
      'Connected booking to the team calendar with reminders and confirmations.',
      'Kept everything calm, accessible, and compliant — no jargon, no clutter.',
    ],
    outcome:
      'Intake time fell roughly 70% with no new hires. Patients self-serve around the clock, and staff start each day with clean, complete records.',
  },
  honuvibe: {
    tier: 'In-house',
    stats: [
      { n: '∞', l: 'programmatic pages' },
      { n: '1', l: 'content engine' },
      { n: 'EN/JP', l: 'bilingual' },
    ],
    challenge:
      'As the AI educators, our own site had to be the proof — not a cobbler’s-children afterthought.',
    approach: [
      'Built a bilingual, programmatic marketing system with an AI assistant baked in.',
      'Stood up a content engine that drafts, schedules, and cross-links on its own.',
      'Made the whole thing fast, accessible, and a reference for every client build.',
    ],
    outcome:
      'A marketing system that largely runs itself — and the clearest possible demo of what we ship for clients.',
  },
};

export function generateStaticParams() {
  return WORK.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = WORK.find((w) => w.slug === slug);
  if (!item) return { title: 'Case study not found' };
  return {
    title: item.category,
    description: item.title,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = WORK.find((w) => w.slug === slug);
  const detail = CASE_DETAILS[slug];
  if (!item || !detail) notFound();

  return (
    <>
      <PageHead crumb={item.category} title={item.title} lede={`${detail.tier} engagement`} />

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="ind-grid" style={{ marginTop: 0, gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {detail.stats.map((s) => (
              <div className="ind reveal" key={s.l} style={{ minHeight: 'auto' }}>
                <div className="amt" style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--teal-deep)' }}>
                  {s.n}
                </div>
                <p style={{ marginTop: 6 }}>{s.l}</p>
              </div>
            ))}
          </div>

          <div className="sec-head reveal" style={{ marginTop: 56 }}>
            <span className="eyebrow">The challenge</span>
            <h2>What needed solving.</h2>
            <p>{detail.challenge}</p>
          </div>

          <div className="sec-head reveal" style={{ marginTop: 48 }}>
            <span className="eyebrow">The approach</span>
            <h2>How we built it.</h2>
          </div>
          <ul className="t-feats" style={{ maxWidth: 720, marginTop: 22 }}>
            {detail.approach.map((a) => (
              <li key={a}>
                <ArrowRight />
                {a}
              </li>
            ))}
          </ul>

          <div className="sec-head reveal" style={{ marginTop: 48 }}>
            <span className="eyebrow coral">The outcome</span>
            <h2>What shipped.</h2>
            <p>{detail.outcome}</p>
          </div>

          <p style={{ marginTop: 40 }}>
            <Link href="/work" className="link-arrow" style={{ display: 'inline-flex' }}>
              ← Back to all work
            </Link>
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
