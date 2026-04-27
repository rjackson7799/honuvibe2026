import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  AboutHero,
  AboutOriginStory,
  AboutTeam,
  AboutAlohaStandard,
  AboutMissionVision,
  AboutSocialSection,
  AboutSoftCta,
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

  it('Hero renders the People-first headline and three facts', () => {
    render(<AboutHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('People');
    expect(h1.textContent).toContain('first.');
    expect(h1.textContent).toContain('Always.');
    expect(screen.getByText('Honolulu')).toBeInTheDocument();
    expect(screen.getByText('EN · JP')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('OriginStory renders Born in Hawaii headline + credential badge + location marker', () => {
    render(<AboutOriginStory />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Born in Hawaii.');
    expect(heading.textContent).toContain('Built for the world.');
    expect(screen.getByText('Ryan Jackson')).toBeInTheDocument();
    expect(
      screen.getByText(/Based in Waikiki, Honolulu, Hawaii/),
    ).toBeInTheDocument();
  });

  it('Team renders three member cards with names, titles, and language badges', () => {
    render(<AboutTeam />);
    expect(
      screen.getByRole('heading', { name: 'Ryan Jackson' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Mizuho H.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Chiemi M.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Founder & Director of AI Education'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('EN').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('日本語').length).toBeGreaterThanOrEqual(2);
  });

  it('AlohaStandard renders the Aloha Standard headline and four numbered values', () => {
    render(<AboutAlohaStandard />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('The Aloha');
    expect(heading.textContent).toContain('Standard.');
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.getByText('We give generously.')).toBeInTheDocument();
    expect(screen.getByText('We never hard sell.')).toBeInTheDocument();
    expect(screen.getByText('Pro-bono work is real work.')).toBeInTheDocument();
    expect(screen.getByText('We celebrate our community.')).toBeInTheDocument();
  });

  it('MissionVision renders both labels', () => {
    render(<AboutMissionVision />);
    expect(screen.getByText('Our Mission')).toBeInTheDocument();
    expect(screen.getByText('Our Vision')).toBeInTheDocument();
  });

  it('SocialSection renders four social cards with external hrefs', () => {
    render(<AboutSocialSection />);
    expect(
      screen.getByRole('heading', { name: 'Follow the journey.' }),
    ).toBeInTheDocument();
    const tiktok = screen.getByRole('link', { name: /TikTok/ });
    expect(tiktok).toHaveAttribute('href', expect.stringContaining('tiktok'));
    expect(tiktok).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Instagram/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /YouTube/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /LINE/ })).toBeInTheDocument();
  });

  it('SoftCta renders both CTAs routing to /learn and /partnerships', () => {
    render(<AboutSoftCta />);
    expect(
      screen.getByRole('heading', { name: 'Ready to start?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Explore Courses/i }),
    ).toHaveAttribute('href', '/learn');
    expect(
      screen.getByRole('link', { name: /Partner With Us/i }),
    ).toHaveAttribute('href', '/partnerships');
  });

  it('renders every About section without console.error', () => {
    const { container } = render(
      <>
        <AboutHero />
        <AboutOriginStory />
        <AboutTeam />
        <AboutAlohaStandard />
        <AboutMissionVision />
        <AboutSocialSection />
        <AboutSoftCta />
      </>,
    );
    expect(container).toBeTruthy();
    expect(within(container).getAllByRole('heading').length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
