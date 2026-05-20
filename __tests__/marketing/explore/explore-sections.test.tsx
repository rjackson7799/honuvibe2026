import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  ExploreReelHero,
  ExploreIndex,
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

  it('ReelHero shows Now Playing, the first project heading, and frame counter', () => {
    render(<ExploreReelHero />);
    expect(screen.getByText(/Now Playing/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'KwameBrathwaite.com' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Frame 01 \/ 02/)).toBeInTheDocument();
    expect(screen.getByLabelText('Next project')).toBeInTheDocument();
  });

  it('Index renders the editorial headline, both live projects, and the end-of-index rule', () => {
    render(<ExploreIndex />);
    expect(
      screen.getByRole('heading', { name: /^Index/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('KwameBrathwaite.com')).toBeInTheDocument();
    expect(screen.getByText('HCI Medical Group')).toBeInTheDocument();
    expect(screen.getByText(/End of index/i)).toBeInTheDocument();
  });

  it('Method renders the chapter label and three numbered step titles', () => {
    render(<ExploreMethod />);
    expect(
      screen.getByRole('heading', { name: /^Method/ }),
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
    expect(screen.getByText(/How we build/i)).toBeInTheDocument();
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

  it('NextIssue renders the dual CTAs routing to /partnerships and /learn', () => {
    render(<ExploreNextIssue />);
    expect(
      screen.getByRole('link', { name: /Tell us about your project/i }),
    ).toHaveAttribute('href', '/partnerships');
    expect(
      screen.getByRole('link', { name: /Start learning/i }),
    ).toHaveAttribute('href', '/learn');
  });

  it('renders every Explore section without console.error', () => {
    render(
      <>
        <ExploreReelHero />
        <ExploreIndex />
        <ExploreMethod />
        <ExploreAlohaStandard />
        <ExploreQuestions />
        <ExploreNextIssue />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
