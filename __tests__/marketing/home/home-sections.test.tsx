import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  HomeHero,
  HomePersonaRouter,
  HomeFeaturedCourses,
  HomeOrgSection,
  HomeTestimonials,
  HomeFinalCta,
} from '@/components/marketing/home';

vi.mock('next-intl', () => {
  function getNs(ns: string): Record<string, unknown> {
    return ns.split('.').reduce<unknown>((o, k) => {
      if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
        return (o as Record<string, unknown>)[k];
      }
      return undefined;
    }, en) as Record<string, unknown>;
  }

  function tFor(ns: string) {
    const base = getNs(ns) ?? {};
    function t(key: string, vars?: Record<string, unknown>): string {
      const raw = (base as Record<string, unknown>)[key];
      if (typeof raw !== 'string') return key;
      // strip any rich tags so assertions on substrings still work
      const flattened = raw.replace(/<\/?[^>]+>/g, '');
      if (!vars) return flattened;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        flattened,
      );
    }
    t.raw = (key: string): unknown => (base as Record<string, unknown>)[key] ?? key;
    t.rich = (
      key: string,
      values?: Record<
        string,
        ((chunks: React.ReactNode) => React.ReactNode) | string | number
      >,
    ): React.ReactNode => {
      const msg = (base as Record<string, unknown>)[key];
      if (typeof msg !== 'string') return key;
      let raw: string = msg;
      const tags: Record<string, (chunks: React.ReactNode) => React.ReactNode> =
        {};
      for (const [k, v] of Object.entries(values ?? {})) {
        if (typeof v === 'function') {
          tags[k] = v;
        } else {
          raw = raw.replace(`{${k}}`, String(v));
        }
      }
      const parts: React.ReactNode[] = [];
      const re = /<([a-zA-Z][\w-]*)>([\s\S]*?)<\/\1>/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(raw)) !== null) {
        if (match.index > lastIndex) {
          parts.push(raw.slice(lastIndex, match.index));
        }
        const [, name, inner] = match;
        const fn = tags?.[name];
        parts.push(fn ? fn(inner) : inner);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < raw.length) parts.push(raw.slice(lastIndex));
      return parts.map((node, idx) => <span key={idx}>{node}</span>);
    };
    return t;
  }

  return {
    useTranslations: (namespace: string) => tFor(namespace),
    useLocale: () => 'en',
  };
});

const studioUrl =
  process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.honuvibe.ai';

describe('Home page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('Hero renders the outcome headline + Vault-first CTAs with correct hrefs', () => {
    render(<HomeHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Learn AI tonight.');
    expect(h1.textContent).toContain('Put it to work');
    expect(h1.textContent).toContain('tomorrow.');
    const primary = screen.getByRole('link', { name: /Join the Vault/i });
    expect(primary).toHaveAttribute('href', '/learn#vault');
    const secondary = screen.getByRole('link', { name: /For Organizations/i });
    expect(secondary).toHaveAttribute('href', '/partnerships');
    expect(screen.getByText('1,400+')).toBeInTheDocument();
  });

  it('PersonaRouter routes all three personas to the right funnels', () => {
    render(<HomePersonaRouter />);
    expect(
      screen.getByRole('heading', { name: 'Who is this for?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Professionals & solopreneurs/i }),
    ).toHaveAttribute('href', '/learn#vault');
    expect(
      screen.getByRole('link', { name: /Organizations/i }),
    ).toHaveAttribute('href', '/partnerships');
    const studio = screen.getByRole('link', { name: /HonuVibe Studio/i });
    expect(studio).toHaveAttribute('href', studioUrl);
    expect(studio).toHaveAttribute('target', '_blank');
    expect(studio).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('FeaturedCourses shows three course titles, the TRACK ribbon, and routes CTAs to /learn#courses', () => {
    render(<HomeFeaturedCourses />);
    expect(screen.getByRole('heading', { name: 'Featured Courses' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Essentials' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Mastery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Builder Track' })).toBeInTheDocument();
    expect(screen.getByText('TRACK')).toBeInTheDocument();
    const courseLinks = screen.getAllByRole('link');
    for (const link of courseLinks) {
      expect(link).toHaveAttribute('href', '/learn#courses');
    }
  });

  it('OrgSection links to /partnerships', () => {
    render(<HomeOrgSection />);
    expect(
      screen.getByRole('heading', {
        name: 'Bring AI training to your team or community.',
      }),
    ).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Explore Partnerships/i });
    expect(cta).toHaveAttribute('href', '/partnerships');
  });

  it('Testimonials (dev-only fallback) shows all three quotes', () => {
    render(<HomeTestimonials />);
    expect(
      screen.getByRole('heading', { name: 'What People Are Saying' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Keiko T.')).toBeInTheDocument();
    expect(screen.getByText('Marcus A.')).toBeInTheDocument();
    expect(screen.getByText('Sarah L.')).toBeInTheDocument();
  });

  it('FinalCta ends the page on a single Vault CTA + two router links + shared refund policy', () => {
    render(<HomeFinalCta />);
    const cta = screen.getByRole('link', { name: /Join the Vault/i });
    expect(cta).toHaveAttribute('href', '/learn#vault');
    expect(
      screen.getByRole('link', { name: /Browse live cohorts/i }),
    ).toHaveAttribute('href', '/learn#courses');
    expect(
      screen.getByRole('link', { name: /Train your team/i }),
    ).toHaveAttribute('href', '/partnerships');
    // note now comes from the shared billing_policy namespace
    expect(
      screen.getByText('Not for you? Full refund within 14 days.'),
    ).toBeInTheDocument();
  });

  it('renders the unchanged sync sections without console.error', () => {
    render(
      <>
        <HomeHero />
        <HomePersonaRouter />
        <HomeFeaturedCourses />
        <HomeOrgSection />
        <HomeTestimonials />
        <HomeFinalCta />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('composes the homepage sections in the redesigned order', () => {
    const src = readFileSync('app/[locale]/page.tsx', 'utf8');
    const main = src.slice(src.indexOf('<main>'), src.indexOf('</main>'));
    const order = [
      'HomeHero',
      'ProofBand',
      'HomePersonaRouter',
      'HomeMembershipBento',
      'HomeFeaturedCourses',
      'HomeOrgSection',
      'HomeFounderNote',
      'ProofStories',
      'HomeFaq',
      'HomeFinalCta',
    ];
    const positions = order.map((tag) => main.indexOf(`<${tag}`));
    positions.forEach((p) => expect(p).toBeGreaterThan(-1));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    // the two retired sections must be gone from the page
    expect(main).not.toContain('<HomeValueProps');
    expect(main).not.toContain('<HomeVaultSection');
  });
});
