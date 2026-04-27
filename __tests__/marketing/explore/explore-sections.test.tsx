import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  ExploreHero,
  ExploreStatsStrip,
  ExploreFeaturedProjects,
  ExploreHowWeBuild,
  ExploreAlohaStandard,
  ExploreTwoPathCta,
} from '@/components/marketing/explore';

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
      const flattened = raw.replace(/<\/?[^>]+>/g, '');
      if (!vars) return flattened;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        flattened,
      );
    }
    return t;
  }

  return {
    useTranslations: (namespace: string) => tFor(namespace),
  };
});

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Explore page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('Hero renders the two-line headline + Our Work overline', () => {
    render(<ExploreHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Real projects.');
    expect(h1.textContent).toContain('Real outcomes.');
    expect(screen.getByText(/Our Work/i)).toBeInTheDocument();
  });

  it('StatsStrip shows all four stat numbers and labels', () => {
    render(<ExploreStatsStrip />);
    expect(screen.getByText('20+')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Projects Shipped')).toBeInTheDocument();
    expect(screen.getByText('Languages Supported')).toBeInTheDocument();
  });

  it('FeaturedProjects renders both project headings, status pills, and the placeholder card with /contact link', () => {
    render(<ExploreFeaturedProjects />);
    expect(
      screen.getByRole('heading', { name: 'KwameBrathwaite.com' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'HCI Medical Group' }),
    ).toBeInTheDocument();
    expect(screen.getByText('IN DEVELOPMENT')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Your Project Could Be Here' }),
    ).toBeInTheDocument();
    const placeholderCta = screen.getByRole('link', {
      name: /Tell us about your project/i,
    });
    expect(placeholderCta).toHaveAttribute('href', '/contact');
  });

  it('HowWeBuild renders three numbered steps with their titles', () => {
    render(<ExploreHowWeBuild />);
    expect(
      screen.getByRole('heading', { name: 'How we build.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Discovery' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Design & Build' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Launch & Support' }),
    ).toBeInTheDocument();
  });

  it('AlohaStandard renders the Built with Aloha headline and a /contact CTA', () => {
    render(<ExploreAlohaStandard />);
    expect(
      screen.getByRole('heading', { name: 'Built with Aloha.' }),
    ).toBeInTheDocument();
    const cta = screen.getByRole('link', {
      name: /Interested in a community or nonprofit collaboration/i,
    });
    expect(cta).toHaveAttribute('href', '/contact');
  });

  it('TwoPathCta renders both CTAs routing to /learn and /partnerships', () => {
    render(<ExploreTwoPathCta />);
    expect(
      screen.getByRole('heading', { name: 'Inspired by what you see?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Start Learning/i }),
    ).toHaveAttribute('href', '/learn');
    expect(
      screen.getByRole('link', { name: /Explore Partnerships/i }),
    ).toHaveAttribute('href', '/partnerships');
  });

  it('renders every Explore section without console.error', () => {
    render(
      <>
        <ExploreHero />
        <ExploreStatsStrip />
        <ExploreFeaturedProjects />
        <ExploreHowWeBuild />
        <ExploreAlohaStandard />
        <ExploreTwoPathCta />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
