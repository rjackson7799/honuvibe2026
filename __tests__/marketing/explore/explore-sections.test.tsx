import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import { STUDIO_URL } from '@/lib/constants/urls';
import {
  WayfindingHero,
  WayfindingRoute,
  ExploreRouteCta,
  ExploreMethod,
  ExploreAlohaStandard,
  ExploreQuestions,
  ExploreNextIssue,
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
      // Support dotted keys (e.g. 'projects.kwame.name')
      const value = key.split('.').reduce<unknown>((o, k) => {
        if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
          return (o as Record<string, unknown>)[k];
        }
        return undefined;
      }, base);
      if (typeof value !== 'string') return key;
      const flattened = value.replace(/<\/?[^>]+>/g, '');
      if (!vars) return flattened;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
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

  it('WayfindingHero shows the eyebrow, the charted headline, and the lede', () => {
    render(<WayfindingHero />);
    expect(
      screen.getByRole('heading', { name: /The Wayfinding\s*Chart/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Exploration log/i)).toBeInTheDocument();
    expect(screen.getByText(/Every project is a crossing/i)).toBeInTheDocument();
  });

  it('WayfindingRoute plots live projects, the in-progress one, and the fog waypoints', () => {
    render(<WayfindingRoute />);
    expect(screen.getByRole('heading', { name: /^The route/ })).toBeInTheDocument();
    // Expanded (live) waypoints
    expect(
      screen.getByRole('heading', { name: 'KwameBrathwaite.com' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'HCI Medical Group' }),
    ).toBeInTheDocument();
    // Compact (in-progress) waypoint
    expect(
      screen.getByRole('heading', { name: 'Vertice Society' }),
    ).toBeInTheDocument();
    // Two confidential rows read as fog
    expect(screen.getAllByText(/Hidden in the fog/i).length).toBeGreaterThanOrEqual(2);
    // A live waypoint links out to its real site
    const visitToKwame = screen
      .getAllByRole('link')
      .some((l) => l.getAttribute('href') === 'https://kwamebrathwaite.com');
    expect(visitToKwame).toBe(true);
  });

  it('ExploreRouteCta is a mid-page Studio nudge that opens Studio in a new tab', () => {
    render(<ExploreRouteCta />);
    const link = screen.getByRole('link', { name: /HonuVibe Studio/i });
    expect(link).toHaveAttribute('href', STUDIO_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('Method renders the "three stars" headline and three step titles', () => {
    render(<ExploreMethod />);
    expect(
      screen.getByRole('heading', { name: /Three stars we steer by/i }),
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

  it('AlohaStandard renders the two-line Aloha headline and a /partnerships link', () => {
    render(<ExploreAlohaStandard />);
    expect(screen.getByText('Built with')).toBeInTheDocument();
    expect(screen.getByText('Aloha.')).toBeInTheDocument();
    const cta = screen.getByRole('link', {
      name: /Interested in a community or nonprofit collaboration/i,
    });
    expect(cta).toHaveAttribute('href', '/partnerships#community');
  });

  it('Questions renders the chapter heading and all five question prompts', () => {
    render(<ExploreQuestions />);
    expect(
      screen.getByRole('heading', { name: /^Questions/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/smallest project/i)).toBeInTheDocument();
    expect(screen.getByText(/locked into a specific stack/i)).toBeInTheDocument();
    expect(screen.getByText(/Do we own the code/i)).toBeInTheDocument();
    expect(screen.getByText(/Japanese localization/i)).toBeInTheDocument();
  });

  it('NextIssue renders the Studio primary (new tab) and Start learning → /learn#vault', () => {
    render(<ExploreNextIssue />);
    const studio = screen.getByRole('link', { name: /Build with our Studio/i });
    expect(studio).toHaveAttribute('href', STUDIO_URL);
    expect(studio).toHaveAttribute('target', '_blank');
    expect(studio).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      screen.getByRole('link', { name: /Start learning/i }),
    ).toHaveAttribute('href', '/learn#vault');
  });

  it('renders every Explore section without console.error', () => {
    render(
      <>
        <WayfindingHero />
        <WayfindingRoute />
        <ExploreRouteCta />
        <ExploreMethod />
        <ExploreAlohaStandard />
        <ExploreQuestions />
        <ExploreNextIssue />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
