import type { ReactNode } from 'react';
import Link from 'next/link';
import { Check } from './studio-icons';
import { PRICING, AI_NATIVE_FROM } from '@/lib/pricing';

// Price amounts derive from the single pricing source of truth (lib/pricing.ts);
// marketing copy (feature lists, descriptions) stays literal here.
const usd = (n: number) => n.toLocaleString('en-US');

export type Tier = {
  name: string;
  desc: string;
  pricePre: string;
  priceAmt: string;
  unit: ReactNode;
  features: string[];
  ctaLabel: string;
  ctaVariant: 'coral' | 'ghost';
  featured?: boolean;
  pop?: string;
};

export const TIERS: Tier[] = [
  {
    name: 'Studio Starter',
    desc: 'A sharp, fast site to get you online and credible — quickly.',
    pricePre: '$',
    priceAmt: usd(PRICING.starter.build),
    unit: (
      <>
        one-time build &nbsp;·&nbsp; <b>${PRICING.starter.monthly}/mo</b> care
      </>
    ),
    features: [
      'Up to 5 polished pages',
      'Mobile-first, fast, WCAG AA',
      'Contact form + analytics',
      'Hosting, updates & monitoring',
    ],
    ctaLabel: 'Choose Starter',
    ctaVariant: 'ghost',
  },
  {
    name: 'Studio Pro',
    desc: 'A growth engine — content, capture, and AI assists baked in.',
    pricePre: '$',
    priceAmt: usd(PRICING.pro.build),
    unit: (
      <>
        build &nbsp;·&nbsp; <b>${PRICING.pro.monthly}/mo</b> care
      </>
    ),
    features: [
      'Everything in Starter',
      'Up to 12 pages + blog/CMS',
      'AI chat assistant + lead capture',
      'SEO system + monthly content',
      'Priority support',
    ],
    ctaLabel: 'Choose Pro',
    ctaVariant: 'coral',
    featured: true,
    pop: 'Most popular',
  },
  {
    name: 'Studio AI-Native',
    desc: 'A custom system that runs and grows your business operations.',
    pricePre: 'from $',
    priceAmt: usd(AI_NATIVE_FROM.build),
    unit: (
      <>
        custom-quoted &nbsp;·&nbsp; <b>from ${AI_NATIVE_FROM.monthly}/mo</b>
      </>
    ),
    features: [
      'Everything in Pro',
      'Custom AI agents & workflows',
      'Integrations (CRM, booking, pay)',
      'Dedicated build team',
    ],
    ctaLabel: 'Request a quote',
    ctaVariant: 'ghost',
  },
];

export function TierCard({ tier }: { tier: Tier }) {
  return (
    <div className={`tier reveal${tier.featured ? ' featured' : ''}`}>
      {tier.pop && <span className="pop">{tier.pop}</span>}
      <span className="t-name">{tier.name}</span>
      <p className="t-desc">{tier.desc}</p>
      <div className="t-price">
        <div className="amt">
          <span className="pre">{tier.pricePre}</span>
          {tier.priceAmt}
        </div>
        <div className="unit">{tier.unit}</div>
      </div>
      <ul className="t-feats">
        {tier.features.map((f) => (
          <li key={f}>
            <Check />
            {f}
          </li>
        ))}
      </ul>
      <Link href="/contact" className={`btn btn-${tier.ctaVariant}`}>
        {tier.ctaLabel}
      </Link>
    </div>
  );
}

export function TierGrid() {
  return (
    <div className="tiers">
      {TIERS.map((t) => (
        <TierCard key={t.name} tier={t} />
      ))}
    </div>
  );
}

export function ServiceTiers() {
  return (
    <section className="section svc-wrap" id="services">
      <div className="container">
        <div className="sec-head center reveal">
          <span className="eyebrow">Services</span>
          <h2>Three ways to build with us.</h2>
          <p>
            Start lean and grow into an AI-native system. Every tier includes
            ongoing care — your site keeps improving after launch.
          </p>
        </div>
        <TierGrid />
        <p className="svc-note">
          Not sure which fits?{' '}
          <Link href="/contact" className="link-arrow" style={{ display: 'inline-flex' }}>
            Tell us about your project
          </Link>{' '}
          and we&apos;ll recommend a tier.
        </p>
      </div>
    </section>
  );
}
