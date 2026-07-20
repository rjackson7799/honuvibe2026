import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import { STUDIO_URL } from '@/lib/constants/urls';
import {
  AboutHero,
  AboutOriginStory,
  AboutPrinciples,
  AboutPacific,
  AboutWays,
  AboutTeam,
  AboutMilestones,
  AboutMissionVision,
  AboutFinalCta,
} from '@/components/marketing/about';
import { ProofBand } from '@/components/marketing/proof-band';

// ProofBand is a shared marketing band and is now an async server component
// (it awaits getTranslations + the governed logo rows).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (ns: string) => {
    const base =
      (en as unknown as Record<string, Record<string, string>>)[ns] ?? {};
    return (key: string, vars?: Record<string, unknown>) => {
      const raw = base[key];
      if (typeof raw !== 'string') return key;
      if (!vars) return raw;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        raw,
      );
    };
  }),
}));

vi.mock('@/lib/proof/queries', () => ({
  getPublishedLogos: vi.fn(async () => []),
}));

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

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

describe('About page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('Hero renders the "returning to" headline, lede, and three chapter chips', () => {
    const { container } = render(<AboutHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('A place worth');
    expect(h1.textContent).toContain('returning to');
    // Chapter chips link to anchors
    expect(container.querySelector('a[href="#origin"]')).toBeTruthy();
    expect(container.querySelector('a[href="#crew"]')).toBeTruthy();
    expect(container.querySelector('a[href="#mission"]')).toBeTruthy();
    // Fact strip
    expect(screen.getByText('EN / 日本語')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('Principles renders the overline and all four operating principles', () => {
    render(<AboutPrinciples />);
    expect(screen.getByText(/WHAT WE BELIEVE · 04 PRINCIPLES/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Senior instruction, always' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Bilingual by default' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Community over content' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'We build what we teach' }),
    ).toBeInTheDocument();
  });

  it('Pacific renders the three hub cities under the where-we-work overline', () => {
    render(<AboutPacific />);
    expect(screen.getByText(/WHERE WE WORK/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Honolulu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tokyo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Los Angeles' })).toBeInTheDocument();
  });

  it('Ways splits Academy (→ /learn) and Studio (→ Studio, new tab)', () => {
    render(<AboutWays />);
    expect(screen.getByText(/TWO WAYS WE WORK/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Explore the Academy/i }),
    ).toHaveAttribute('href', '/learn');
    const studio = screen.getByRole('link', { name: /Visit HonuVibe Studio/i });
    expect(studio).toHaveAttribute('href', STUDIO_URL);
    expect(studio).toHaveAttribute('target', '_blank');
    expect(studio).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('Milestones renders the log with founding and the returning-community entry', () => {
    render(<AboutMilestones />);
    expect(screen.getByText(/THE STORY SO FAR/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'HonuVibe is founded' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'A community that returns' }),
    ).toBeInTheDocument();
  });

  it('OriginStory renders the chapter overline, headline, and CTA (no founder tile)', () => {
    render(<AboutOriginStory />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('A question');
    expect(heading.textContent).toContain("that wouldn't go away");
    expect(screen.getByText(/CH\. 01 · ORIGIN/)).toBeInTheDocument();
    // Founder proof tile removed — Ryan Jackson should not appear here
    expect(screen.queryByRole('heading', { name: 'Ryan Jackson' })).toBeNull();
    expect(screen.getByRole('link', { name: /See what we're building/ })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('Team renders Ryan + Mizuho + Chiemi with cadence row and CTA', () => {
    render(<AboutTeam />);
    expect(screen.getByText(/CH\. 02 · THE CREW/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ryan Jackson' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mizuho H.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chiemi M.' })).toBeInTheDocument();
    expect(screen.getByText('Founder & Director of AI Education')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See what we teach/ })).toHaveAttribute(
      'href',
      '/learn',
    );
  });

  it('MissionVision renders chapter header, both labels, and cadence row', () => {
    render(<AboutMissionVision />);
    expect(screen.getByText(/CH\. 03 · MISSION & VISION/)).toBeInTheDocument();
    expect(screen.getAllByText('Mission').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vision').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('2030+')).toBeInTheDocument();
    expect(screen.getByText('US + Japan')).toBeInTheDocument();
  });

  it('FinalCta closes the page on a single Vault CTA + two router links', () => {
    render(<AboutFinalCta />);
    expect(screen.getByText('the next chapter')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Write it with us\./ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Start in the Vault/i }),
    ).toHaveAttribute('href', '/learn#vault');
    expect(
      screen.getByRole('link', { name: /Join a live cohort/i }),
    ).toHaveAttribute('href', '/learn#courses');
    expect(
      screen.getByRole('link', { name: /Bring HonuVibe to your team/i }),
    ).toHaveAttribute('href', '/partnerships');
  });

  it('renders every About section without console.error', async () => {
    const proofBand = await ProofBand({ vaultTotalCount: 42 });
    const { container } = render(
      <>
        <AboutHero />
        {proofBand}
        <AboutOriginStory />
        <AboutPrinciples />
        <AboutPacific />
        <AboutWays />
        <AboutTeam />
        <AboutMilestones />
        <AboutMissionVision />
        <AboutFinalCta />
      </>,
    );
    expect(container).toBeTruthy();
    expect(within(container).getAllByRole('heading').length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
