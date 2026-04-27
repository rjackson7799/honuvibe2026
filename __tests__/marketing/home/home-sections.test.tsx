import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  HomeHero,
  HomeHowItWorks,
  HomeValueProps,
  HomeVaultSection,
  HomeFeaturedCourses,
  HomeOrgSection,
  HomeExploration,
  HomeTestimonials,
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
    t.rich = (
      key: string,
      tags?: Record<string, (chunks: React.ReactNode) => React.ReactNode>,
    ): React.ReactNode => {
      const raw = (base as Record<string, unknown>)[key];
      if (typeof raw !== 'string') return key;
      // Resolve <name>inner</name> tags by calling tags[name](inner). Untagged
      // text is returned as-is. This does not handle nesting beyond one level —
      // sufficient for our current rich messages.
      const parts: React.ReactNode[] = [];
      const re = /<([a-zA-Z][\w-]*)>([\s\S]*?)<\/\1>/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let i = 0;
      while ((match = re.exec(raw)) !== null) {
        if (match.index > lastIndex) {
          parts.push(raw.slice(lastIndex, match.index));
        }
        const [, name, inner] = match;
        const fn = tags?.[name];
        parts.push(fn ? fn(inner) : inner);
        lastIndex = match.index + match[0].length;
        i += 1;
      }
      if (lastIndex < raw.length) parts.push(raw.slice(lastIndex));
      return parts.map((node, idx) =>
        typeof node === 'string' || typeof node === 'number' ? (
          <span key={idx}>{node}</span>
        ) : (
          <span key={idx}>{node}</span>
        ),
      );
    };
    return t;
  }

  return {
    useTranslations: (namespace: string) => tFor(namespace),
  };
});

describe('Home page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('Hero renders the three-line headline + both CTAs with correct hrefs', () => {
    render(<HomeHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Learn AI.');
    expect(h1.textContent).toContain('Apply It.');
    expect(h1.textContent).toContain('Move Forward.');
    const explore = screen.getByRole('link', { name: /Explore Courses/i });
    expect(explore).toHaveAttribute('href', '/learn');
    const partner = screen.getByRole('link', { name: /Partner With Us/i });
    expect(partner).toHaveAttribute('href', '/partnerships');
  });

  it('HowItWorks shows the three card titles', () => {
    render(<HomeHowItWorks />);
    expect(screen.getByText('How HonuVibe Works')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Move Forward' })).toBeInTheDocument();
  });

  it('ValueProps shows all three card headlines + JP badge', () => {
    render(<HomeValueProps />);
    expect(
      screen.getByRole('heading', { name: /Practical, not theoretical/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Bilingual by design/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('日本語対応')).toBeInTheDocument();
    expect(screen.getByText('Members only')).toBeInTheDocument();
  });

  it('VaultSection shows heading and full lesson grid', () => {
    render(<HomeVaultSection />);
    expect(
      screen.getByRole('heading', { name: 'A learning library that grows with you.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tool Use Basics')).toBeInTheDocument();
    expect(screen.getByText('API Integration')).toBeInTheDocument();
  });

  it('FeaturedCourses shows three course titles, the TRACK ribbon, and routes CTAs to /learn', () => {
    render(<HomeFeaturedCourses />);
    expect(screen.getByRole('heading', { name: 'Featured Courses' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Essentials' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Mastery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Builder Track' })).toBeInTheDocument();
    expect(screen.getByText('TRACK')).toBeInTheDocument();
    const courseLinks = screen.getAllByRole('link');
    for (const link of courseLinks) {
      expect(link).toHaveAttribute('href', '/learn');
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

  it('Exploration links the see-all CTA to /explore and shows all three projects', () => {
    render(<HomeExploration />);
    expect(
      screen.getByRole('heading', { name: 'Explore Our Work' }),
    ).toBeInTheDocument();
    expect(screen.getByText('KwameBrathwaite.com')).toBeInTheDocument();
    expect(screen.getByText('MamaTree Market')).toBeInTheDocument();
    expect(screen.getByText('HonuHub Scheduler')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Explore our work/i });
    expect(cta).toHaveAttribute('href', '/explore');
  });

  it('Testimonials shows all three quotes', () => {
    render(<HomeTestimonials />);
    expect(
      screen.getByRole('heading', { name: 'What People Are Saying' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Keiko T.')).toBeInTheDocument();
    expect(screen.getByText('Marcus A.')).toBeInTheDocument();
    expect(screen.getByText('Sarah L.')).toBeInTheDocument();
  });

  it('renders every section without console.error', () => {
    render(
      <>
        <HomeHero />
        <HomeHowItWorks />
        <HomeValueProps />
        <HomeVaultSection />
        <HomeFeaturedCourses />
        <HomeOrgSection />
        <HomeExploration />
        <HomeTestimonials />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
