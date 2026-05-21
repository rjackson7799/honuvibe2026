import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  AboutHero,
  AboutOriginStory,
  AboutTeam,
  AboutMissionVision,
  AboutClosingCta,
} from '@/components/marketing/about';

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

  it('Hero renders the navy headline, lede, and three chapter chips', () => {
    const { container } = render(<AboutHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Practical AI education,');
    expect(h1.textContent).toContain('delivered with aloha');
    // Chapter chips link to anchors
    expect(container.querySelector('a[href="#origin"]')).toBeTruthy();
    expect(container.querySelector('a[href="#crew"]')).toBeTruthy();
    expect(container.querySelector('a[href="#mission"]')).toBeTruthy();
    // Fact strip
    expect(screen.getByText('EN / 日本語')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('OriginStory renders the chapter overline, headline, and Ryan proof tile', () => {
    render(<AboutOriginStory />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('A question');
    expect(heading.textContent).toContain("that wouldn't go away");
    expect(screen.getByText(/CH\. 01 · ORIGIN/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ryan Jackson' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See what we're building/ })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('Team renders Ryan + Chiemi (not Mizuho) with cadence row and CTA', () => {
    render(<AboutTeam />);
    expect(screen.getByText(/CH\. 02 · THE CREW/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ryan Jackson' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chiemi M.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mizuho H.' })).toBeNull();
    expect(screen.getByText('Founder & Director of AI Education')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See what we teach/ })).toHaveAttribute(
      'href',
      '/learn',
    );
  });

  it('MissionVision renders chapter header, both labels, and cadence row', () => {
    render(<AboutMissionVision />);
    expect(screen.getByText(/CH\. 03 · WHAT WE'RE BUILDING TOWARD/)).toBeInTheDocument();
    expect(screen.getAllByText('Mission').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vision').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('2030+')).toBeInTheDocument();
    expect(screen.getByText('US + Japan')).toBeInTheDocument();
  });

  it('ClosingCta renders meta strip + dual CTA (Learn primary, Partnerships secondary)', () => {
    render(<AboutClosingCta />);
    expect(screen.getByText(/END OF ISSUE 01/)).toBeInTheDocument();
    expect(screen.getByText(/FIN/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Start learning/i }),
    ).toHaveAttribute('href', '/learn');
    expect(
      screen.getByRole('link', { name: /Partner with us/i }),
    ).toHaveAttribute('href', '/partnerships');
  });

  it('renders every About section without console.error', () => {
    const { container } = render(
      <>
        <AboutHero />
        <AboutOriginStory />
        <AboutTeam />
        <AboutMissionVision />
        <AboutClosingCta />
      </>,
    );
    expect(container).toBeTruthy();
    expect(within(container).getAllByRole('heading').length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
