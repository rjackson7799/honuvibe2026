import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  LearnHero,
  LearnChapterVault,
  LearnStartTonight,
} from '@/components/marketing/learn';
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
      // Support dotted keys within a namespace (e.g. 'community.title').
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
    useLocale: () => 'en',
  };
});

// The learn barrel pulls in LearnChapterCourses → courses-catalog-client, which
// imports @/i18n/navigation (next-intl createNavigation → next/navigation). Mock
// it so the barrel loads in jsdom without resolving the real navigation module.
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
  usePathname: () => '/learn',
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  redirect: () => {},
  getPathname: () => '/learn',
}));

describe('Learn page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('Hero renders the Vault-first headline + Vault-first CTAs', () => {
    render(<LearnHero locale="en" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Every lesson we teach.');
    expect(h1.textContent).toContain('One membership.');
    const primary = screen.getByRole('link', { name: /Join the Vault/i });
    expect(primary).toHaveAttribute('href', '#vault');
    const secondary = screen.getByRole('link', { name: /See upcoming cohorts/i });
    expect(secondary).toHaveAttribute('href', '#courses');
  });

  it('ProofBand renders the numbers strip with learner + lesson counts', async () => {
    render(await ProofBand({ vaultTotalCount: 42 }));
    expect(screen.getByText('1,400+')).toBeInTheDocument();
    expect(screen.getByText('learners')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('bilingual lessons')).toBeInTheDocument();
  });

  it('ProofBand hides the lesson stat when the count is zero', async () => {
    render(await ProofBand({ vaultTotalCount: 0 }));
    expect(screen.getByText('1,400+')).toBeInTheDocument();
    expect(screen.queryByText('bilingual lessons')).not.toBeInTheDocument();
  });

  it('ChapterVault renders the anchored 3-card ladder with correct CTAs', () => {
    render(<LearnChapterVault locale="en" vaultTotalCount={42} />);

    // Three price points, one pricing moment.
    expect(screen.getByText('$29')).toBeInTheDocument();
    expect(screen.getByText('$99')).toBeInTheDocument();
    expect(screen.getByText('$1,250+')).toBeInTheDocument();

    // Vault is the RECOMMENDED middle card.
    expect(screen.getByText(/RECOMMENDED/)).toBeInTheDocument();

    // "Best for" captions folded from the retired comparison table.
    expect(screen.getByText('Best for staying current')).toBeInTheDocument();
    expect(
      screen.getByText('Best for going deep on your own time'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Best for learning live, with a group'),
    ).toBeInTheDocument();

    // Community + Vault route to Stripe; Live Cohorts routes in-page to #courses.
    expect(
      screen.getByRole('link', { name: /Join the Community/i }),
    ).toHaveAttribute('href', '/api/stripe/subscribe?tier=community');
    expect(
      screen.getByRole('link', { name: /Join the Vault/i }),
    ).toHaveAttribute('href', '/api/stripe/subscribe?tier=vault');
    expect(
      screen.getByRole('link', { name: /See upcoming cohorts/i }),
    ).toHaveAttribute('href', '#courses');
  });

  it('StartTonight is de-priced to a single Vault CTA + two router links', () => {
    render(<LearnStartTonight />);
    const cta = screen.getByRole('link', { name: /Join the Vault/i });
    expect(cta).toHaveAttribute('href', '#vault');
    expect(
      screen.getByRole('link', { name: /Browse live cohorts/i }),
    ).toHaveAttribute('href', '#courses');
    expect(
      screen.getByRole('link', { name: /Train your team/i }),
    ).toHaveAttribute('href', '/partnerships');
  });

  it('renders every reworked section without console.error', async () => {
    const proofBand = await ProofBand({ vaultTotalCount: 42 });
    render(
      <>
        <LearnHero locale="en" />
        {proofBand}
        <LearnChapterVault locale="en" vaultTotalCount={42} />
        <LearnStartTonight />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
