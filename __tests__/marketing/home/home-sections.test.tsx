import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';
import {
  HomeHero,
  HomeHowLearn,
  HomeMoreWays,
  HomePanelBuild,
  HomePanelLearn,
  HomePanelPartner,
  HomePricing,
  pickHomeLessons,
  toHomeProofQuote,
} from '@/components/marketing/home';
import { TRACK_IDS } from '@/lib/tracks';
import { studioFromPrice } from '@/lib/pricing';
import type { PublicCatalogItem } from '@/lib/vault/catalog';
import type { PublicProofArtifact } from '@/lib/proof/types';
import { stubMatchMedia } from '../hv/helpers';

const i18n = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ja' }));

vi.mock('next-intl', async () => {
  const messages = {
    en: (await import('@/messages/en.json')).default,
    ja: (await import('@/messages/ja.json')).default,
  };
  const lookup = (path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
        messages[i18n.locale],
      );
  const fill = (s: string, vars?: Record<string, unknown>) =>
    Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), s);
  function tFor(ns: string) {
    const t = (key: string, vars?: Record<string, unknown>) => {
      const raw = lookup(`${ns}.${key}`);
      return typeof raw === 'string' ? fill(raw, vars) : `${ns}.${key}`;
    };
    t.raw = (key: string) => lookup(`${ns}.${key}`);
    t.rich = (key: string, tags: Record<string, (chunks: ReactNode) => ReactNode>) => {
      const raw = lookup(`${ns}.${key}`) as string;
      return raw.split(/(<\w+>[^<]*<\/\w+>)/).map((part, i) => {
        const m = part.match(/^<(\w+)>([^<]*)<\/\1>$/);
        return <span key={i}>{m ? tags[m[1]](m[2]) : part}</span>;
      });
    };
    return t;
  }
  return { useTranslations: (ns: string) => tFor(ns), useLocale: () => i18n.locale };
});

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-intl-link="true" {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: ({ fill: _fill, ...props }: Record<string, unknown>) => <img {...props} />,
}));

function item(over: Partial<PublicCatalogItem>): PublicCatalogItem {
  return {
    id: 'x',
    slug: 'x',
    title_en: 'X',
    title_jp: null,
    description_en: null,
    description_jp: null,
    content_type: 'video',
    thumbnail_url: null,
    duration_minutes: null,
    difficulty_level: null,
    language: 'both',
    access_tier: 'free',
    track: 'ai_essentials',
    is_featured: false,
    publish_date: '2026-01-01',
    series_id: null,
    series_order: null,
    ...over,
  } as PublicCatalogItem;
}

const CATALOG: PublicCatalogItem[] = [
  item({ id: 'f1', title_en: 'Featured old', title_jp: '注目・古い', is_featured: true, publish_date: '2026-01-01' }),
  item({ id: 'f2', title_en: 'Featured new', title_jp: '注目・新しい', is_featured: true, publish_date: '2026-02-01' }),
  ...[1, 2, 3, 4, 5, 6, 7].map((n) =>
    item({ id: `n${n}`, title_en: `Lesson ${n}`, title_jp: `レッスン${n}`, publish_date: `2026-03-0${n}` }),
  ),
];

function proof(over: Partial<PublicProofArtifact>): PublicProofArtifact {
  return {
    id: 'p',
    artifact_type: 'testimonial',
    quote_en: null,
    quote_jp: null,
    title_en: null,
    title_jp: null,
    person_name: null,
    role_en: null,
    role_jp: null,
    org: null,
    person_image_url: null,
    logo_url: null,
    organization_url: null,
    rating: null,
    metrics_json: {},
    course_id: null,
    is_featured: false,
    display_order: 0,
    ...over,
  };
}

const panels = { learn: <p>learn panel</p>, build: <p>build panel</p>, partner: <p>partner panel</p> };

describe('Home (Unit 1)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    i18n.locale = 'en';
    stubMatchMedia(false);
    errorSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  describe('pickHomeLessons', () => {
    it('rotator is featured first then newest, capped at five; recent is the four newest not in it', () => {
      const { rotator, recent } = pickHomeLessons(CATALOG, 'en');
      expect(rotator.map((l) => l.title)).toEqual(['Featured new', 'Featured old', 'Lesson 7', 'Lesson 6', 'Lesson 5']);
      expect(recent.map((l) => l.title)).toEqual(['Lesson 4', 'Lesson 3', 'Lesson 2', 'Lesson 1']);
    });

    it('uses title_jp on /ja, falling back to title_en', () => {
      const { rotator } = pickHomeLessons(
        [item({ id: 'a', title_en: 'A', title_jp: 'エー' }), item({ id: 'b', title_en: 'B' })],
        'ja',
      );
      expect(rotator.map((l) => l.title)).toEqual(['エー', 'B']);
    });

    it('an empty catalog yields nothing', () => {
      expect(pickHomeLessons([], 'en')).toEqual({ rotator: [], recent: [] });
    });
  });

  describe('HomeHero', () => {
    it('renders the H1, both CTAs and the rotator from catalog titles', () => {
      const { rotator } = pickHomeLessons(CATALOG, 'en');
      render(<HomeHero rotator={rotator} proofQuote={null} lessonCount={27} defaultTab="learn" panels={panels} />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.home.hero.headline);
      expect(screen.getByRole('link', { name: /Get started free/ })).toHaveAttribute('href', '/signup');
      expect(screen.getByRole('link', { name: 'Browse the tracks' })).toHaveAttribute('href', '/learn');
      const eyebrow = screen.getByRole('link', { name: /New in the Vault/ });
      expect(eyebrow).toHaveAttribute('href', '/learn');
      expect(within(eyebrow).getByTestId('hv-rotating-word')).toHaveTextContent('Featured new →');
    });

    it('/ja renders JA copy and title_jp in the rotator', () => {
      i18n.locale = 'ja';
      const { rotator } = pickHomeLessons(CATALOG, 'ja');
      render(<HomeHero rotator={rotator} proofQuote={null} lessonCount={27} defaultTab="learn" panels={panels} />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ja.home.hero.headline);
      expect(screen.getByTestId('hv-rotating-word')).toHaveTextContent('注目・新しい →');
    });

    it('an empty catalog hides the eyebrow row without throwing', () => {
      render(<HomeHero rotator={[]} proofQuote={null} lessonCount={0} defaultTab="learn" panels={panels} />);
      expect(screen.queryByRole('link', { name: /New in the Vault/ })).toBeNull();
      expect(screen.queryByTestId('hv-rotating-word')).toBeNull();
    });

    it('proof line: a quote when present, else the lesson count, else nothing', () => {
      const quote = toHomeProofQuote(
        proof({ quote_en: 'It changed how we work.', person_name: 'Aiko', org: 'Acme' }),
        'en',
      );
      const { rerender } = render(
        <HomeHero rotator={[]} proofQuote={quote} lessonCount={27} defaultTab="learn" panels={panels} />,
      );
      expect(screen.getByTestId('home-proof-line')).toHaveTextContent('“It changed how we work.” — Aiko, Acme');
      rerender(<HomeHero rotator={[]} proofQuote={null} lessonCount={27} defaultTab="learn" panels={panels} />);
      expect(screen.getByTestId('home-proof-line')).toHaveTextContent('27 lessons across five tracks.');
      rerender(<HomeHero rotator={[]} proofQuote={null} lessonCount={0} defaultTab="learn" panels={panels} />);
      expect(screen.queryByTestId('home-proof-line')).toBeNull();
    });
  });

  describe('toHomeProofQuote', () => {
    it('trims to 140 characters, prefers quote_jp on /ja and falls back to quote_en', () => {
      const long = 'a'.repeat(200);
      expect(toHomeProofQuote(proof({ quote_en: long, org: 'Acme' }), 'en')!.quote).toHaveLength(140);
      expect(toHomeProofQuote(proof({ quote_en: 'EN', quote_jp: 'JP', org: 'Acme' }), 'ja')!.quote).toBe('JP');
      expect(toHomeProofQuote(proof({ quote_en: 'EN', org: 'Acme' }), 'ja')!.quote).toBe('EN');
    });

    it('never shows an unattributed or empty quote', () => {
      expect(toHomeProofQuote(proof({ quote_en: 'Great' }), 'en')).toBeNull();
      expect(toHomeProofQuote(proof({ person_name: 'Aiko' }), 'en')).toBeNull();
      expect(toHomeProofQuote(undefined, 'en')).toBeNull();
    });
  });

  describe('panels', () => {
    it('Learn: five track rows in TRACK_IDS order linking /learn?track=<id>, labels from tracks', () => {
      const { recent } = pickHomeLessons(CATALOG, 'en');
      const { container } = render(<HomePanelLearn recent={recent} />);
      const rows = within(container.querySelector('ol')!).getAllByRole('link');
      expect(rows.map((r) => r.getAttribute('href'))).toEqual(TRACK_IDS.map((id) => `/learn?track=${id}`));
      TRACK_IDS.forEach((id, i) => expect(rows[i]).toHaveTextContent(en.tracks[id].label));
      expect(within(screen.getByTestId('home-recent')).getAllByRole('link')).toHaveLength(4);
      expect(screen.getByRole('link', { name: /Get started free/ })).toHaveAttribute(
        'href',
        '/learn?track=ai_essentials',
      );
      expect(screen.getByText('AI Essentials', { selector: 'strong' })).toBeInTheDocument();
    });

    it('Learn: no recent lessons hides the chip row', () => {
      render(<HomePanelLearn recent={[]} />);
      expect(screen.queryByTestId('home-recent')).toBeNull();
    });

    it('Build: price follows studioFromPrice and hides when showPrice is false; CTA to /build', () => {
      const price = `$${studioFromPrice().toLocaleString('en-US')}`;
      const { rerender } = render(<HomePanelBuild price={price} showPrice />);
      expect(screen.getByTestId('home-build-price')).toHaveTextContent(`Transparent tiers from ${price}`);
      expect(screen.getByRole('link', { name: /Start a project/ })).toHaveAttribute('href', '/build');
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
      expect(screen.queryByText(/Mobile app/)).toBeNull();
      rerender(<HomePanelBuild price={price} showPrice={false} />);
      expect(screen.queryByTestId('home-build-price')).toBeNull();
    });

    it('Partner: two cards and a CTA to /partner', () => {
      render(<HomePanelPartner />);
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
      expect(screen.getByRole('link', { name: /Talk about a partnership/ })).toHaveAttribute('href', '/partner');
    });
  });

  describe('sections below the hero', () => {
    it('HowLearn: H2, sample-lesson CTA, two labelled marquees and three steps', () => {
      render(<HomeHowLearn />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(en.home.how.heading);
      expect(screen.getByRole('link', { name: /See a sample lesson/ })).toHaveAttribute('href', '/learn');
      expect(screen.getByRole('list', { name: 'Tools covered' })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Topics covered' })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    });

    it('MoreWays: Build card → /build with the price, Partner card → /partner', () => {
      const { rerender } = render(<HomeMoreWays price="$500" showPrice />);
      expect(screen.getByRole('link', { name: /we build it with you/ })).toHaveAttribute('href', '/build');
      expect(screen.getByRole('link', { name: /Bring the courses/ })).toHaveAttribute('href', '/partner');
      expect(screen.getByTestId('home-more-price')).toHaveTextContent('from $500');
      rerender(<HomeMoreWays price="$500" showPrice={false} />);
      expect(screen.queryByTestId('home-more-price')).toBeNull();
    });

    it('Pricing: Community → /signup (amber), Vault → the subscribe API (outline-dark)', () => {
      render(<HomePricing showPrices />);
      const community = screen.getByRole('link', { name: /Get started free/ });
      expect(community).toHaveAttribute('href', '/signup');
      expect(community.className).toContain('bg-hv-amber');
      const vault = screen.getByRole('link', { name: /Join the Vault/ });
      expect(vault).toHaveAttribute('href', '/api/stripe/subscribe?tier=vault');
      expect(vault).not.toHaveAttribute('data-intl-link');
      expect(vault.className).toContain('border-hv-green-600');
      expect(screen.getByText('$99')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('Pricing on /ja: the Vault CTA carries &locale=ja (never /ja/api); $99 hides with showPrices off', () => {
      i18n.locale = 'ja';
      render(<HomePricing showPrices={false} />);
      const vault = screen.getByRole('link', { name: new RegExp(ja.home.pricing.vault.cta) });
      expect(vault).toHaveAttribute('href', '/api/stripe/subscribe?tier=vault&locale=ja');
      expect(screen.queryByText('$99')).toBeNull();
      expect(screen.getByText(ja.home.pricing.community.price)).toBeInTheDocument();
    });
  });

  it('page composes Hero → HowLearn → MoreWays → Pricing and keeps RecoveryHashRedirect', () => {
    const src = readFileSync('app/[locale]/page.tsx', 'utf8');
    expect(src).toContain('<RecoveryHashRedirect locale={locale} />');
    expect(src).toContain('<MarketingShell theme="hv">');
    const main = src.slice(src.indexOf('<main>'), src.indexOf('</main>'));
    const positions = ['<HomeHero', '<HomeHowLearn', '<HomeMoreWays', '<HomePricing'].map((tag) => main.indexOf(tag));
    positions.forEach((p) => expect(p).toBeGreaterThan(-1));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(src.match(/<HvReveal\b/g)).toHaveLength(1);
  });
});
