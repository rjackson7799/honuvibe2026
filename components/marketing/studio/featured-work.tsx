import type { ReactNode } from 'react';
import Link from 'next/link';
import { HonuGlyph } from './honu-glyph';
import { ArrowRight } from './studio-icons';

type Thumb = 'kwame' | 'hci' | 'honu';

export type WorkItem = {
  slug: string;
  badge: string;
  category: string;
  title: string;
  result: ReactNode;
  thumb: Thumb;
};

export const WORK: WorkItem[] = [
  {
    slug: 'kwame-brathwaite',
    badge: 'Creator · Archive',
    category: 'Kwame Brathwaite Archive',
    title: 'A photography legacy, made shoppable.',
    result: (
      <>
        An AI-native archive and print store that turned a historic catalog into a
        living storefront — <b>3.4× more inbound</b> in the first month.
      </>
    ),
    thumb: 'kwame',
  },
  {
    slug: 'hci',
    badge: 'Healthcare',
    category: 'HCI — Health & Care Institute',
    title: 'Patient intake, down to minutes.',
    result: (
      <>
        An AI-assisted intake and booking system replaced phone tag and PDFs —{' '}
        <b>intake time cut 70%</b> with zero new hires.
      </>
    ),
    thumb: 'hci',
  },
  {
    slug: 'honuvibe',
    badge: 'In-house',
    category: 'HonuVibe.AI',
    title: 'Our own AI-native marketing system.',
    result: (
      <>
        The site you&apos;d expect from an AI studio — programmatic pages, an AI
        assistant, and a content engine that <b>runs itself</b>.
      </>
    ),
    thumb: 'honu',
  },
];

function ThumbArt({ item }: { item: WorkItem }) {
  if (item.thumb === 'kwame') {
    return (
      <div className="work-thumb thumb-kwame">
        <span className="badge">{item.badge}</span>
        <div className="frame" />
      </div>
    );
  }
  if (item.thumb === 'hci') {
    return (
      <div className="work-thumb thumb-hci">
        <span className="badge">{item.badge}</span>
        <div className="pulse">
          <svg viewBox="0 0 120 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 32h22l8-22 12 40 9-30 7 14h47" />
          </svg>
        </div>
      </div>
    );
  }
  return (
    <div className="work-thumb thumb-honu">
      <span className="badge">{item.badge}</span>
      <HonuGlyph variant="inverted" className="hg" />
    </div>
  );
}

export function WorkCard({ item }: { item: WorkItem }) {
  return (
    <article className="card work-card reveal">
      <ThumbArt item={item} />
      <div className="work-body">
        <span className="cat">{item.category}</span>
        <h3>{item.title}</h3>
        <p className="result">{item.result}</p>
        <Link href={`/work/${item.slug}`} className="link-arrow">
          View case study
          <ArrowRight />
        </Link>
      </div>
    </article>
  );
}

export function FeaturedWork() {
  return (
    <section className="section" id="work">
      <div className="container">
        <div className="sec-head reveal">
          <span className="eyebrow">Featured work</span>
          <h2>Proof, not promises.</h2>
          <p>
            The people teaching AI are the ones shipping it. Here&apos;s a slice of
            what that looks like in production.
          </p>
        </div>
        <div className="work-grid">
          {WORK.map((item) => (
            <WorkCard key={item.slug} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
