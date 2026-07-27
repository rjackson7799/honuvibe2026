import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/students/actions', () => ({ markOnboarded: vi.fn() }));

vi.mock('@/components/auth/SetPasswordCard', () => ({
  SetPasswordCard: () => <div data-testid="set-password-card" />,
}));

vi.mock('@/components/learn/CourseCard', () => ({
  CourseCard: () => <div data-testid="course-card" />,
}));

// Server-component translator. Interpolates {var} the same way the repo's
// client-side vi.mock('next-intl') helpers do.
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale }: { locale: string; namespace: string }) => {
    const messages = (locale === 'ja' ? ja : en) as Record<string, Record<string, unknown>>;
    return (key: string, vars?: Record<string, unknown>) => {
      const raw = messages.dashboard[key];
      if (typeof raw !== 'string') return key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        raw,
      );
    };
  },
}));

import { PartnerHomeModule } from '@/components/learn/PartnerHomeModule';
import { PartnerIdentity } from '@/components/learn/PartnerIdentity';
import { DashboardWelcomeHeader } from '@/components/learn/DashboardWelcomeHeader';
import { WelcomeScreen } from '@/components/learn/WelcomeScreen';
import { CommunityTile } from '@/components/learn/CommunityTile';
import type { ActivePartnerContext } from '@/lib/partners/active-partner';
import type { PartnerCatalogItem, PartnerCatalogResult } from '@/lib/partners/catalog';

const PARTNER: ActivePartnerContext = {
  partnerId: 'p-1',
  slug: 'vertice-society',
  name: 'Vertice Society',
  logoUrl: null,
  accent: '#1a2b33',
  accentSubtle: 'rgba(26, 43, 51, 0.1)',
  accentWash: 'rgba(15, 169, 160, 0.06)',
};

function item(id: string, enrollment: PartnerCatalogItem['enrollment']): PartnerCatalogItem {
  return {
    course: {
      id,
      slug: `slug-${id}`,
      title_en: `Course ${id}`,
      title_jp: `コース${id}`,
      description_en: 'A description',
      description_jp: '説明',
      thumbnail_url: null,
      level: null,
      total_weeks: null,
      language: 'en',
    },
    displayOrder: 0,
    enrollment,
  };
}

const ok = (items: PartnerCatalogItem[]): PartnerCatalogResult => ({
  status: 'ok',
  items,
  truncated: false,
});

// jsdom normalizes an inline-style hex to rgb(); CSS custom properties keep
// their raw value. Accept either form so the assertion is about the accent
// being applied, not about serialization.
const ACCENT_FORMS = ['#1a2b33', 'rgb(26, 43, 51)'];
const paintsAccent = (html: string | null | undefined) =>
  ACCENT_FORMS.some((form) => (html ?? '').includes(form));

describe('PartnerHomeModule — states', () => {
  it('renders the partner name in the heading and the coming-soon copy when empty', async () => {
    render(await PartnerHomeModule({ partner: PARTNER, catalog: ok([]), locale: 'en' }));

    expect(screen.getByText('Vertice Society home')).toBeInTheDocument();
    expect(screen.getByText(/on the way/i)).toBeInTheDocument();
  });

  it('renders partial copy and the surviving rows, never coming-soon', async () => {
    render(
      await PartnerHomeModule({
        partner: PARTNER,
        catalog: { status: 'partial', items: [item('a', { state: 'not_enrolled' })], truncated: false },
        locale: 'en',
      }),
    );

    expect(screen.getByText(/couldn't be loaded/i)).toBeInTheDocument();
    expect(screen.getByText('Course a')).toBeInTheDocument();
    expect(screen.queryByText(/on the way/i)).not.toBeInTheDocument();
  });

  it('renders partial copy — NOT coming-soon — when the surviving source is empty', async () => {
    render(
      await PartnerHomeModule({
        partner: PARTNER,
        catalog: { status: 'partial', items: [], truncated: false },
        locale: 'en',
      }),
    );

    expect(screen.getByText(/couldn't be loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/on the way/i)).not.toBeInTheDocument();
  });

  it('renders error copy and no rows', async () => {
    render(
      await PartnerHomeModule({
        partner: PARTNER,
        catalog: { status: 'error', items: [] },
        locale: 'en',
      }),
    );

    expect(screen.getByText(/couldn't load these courses/i)).toBeInTheDocument();
    expect(screen.queryByText(/on the way/i)).not.toBeInTheDocument();
  });

  it('uses distinct copy for empty, partial and error', async () => {
    const dash = en.dashboard as Record<string, string>;
    const copies = [
      dash.partner_home_empty,
      dash.partner_home_partial,
      dash.partner_home_error,
    ];
    expect(new Set(copies).size).toBe(3);
  });
});

describe('PartnerHomeModule — card states', () => {
  const cases: Array<[PartnerCatalogItem['enrollment'], string, boolean]> = [
    [{ state: 'active', progressPercent: 40 }, 'Continue', true],
    [{ state: 'completed', progressPercent: 100 }, 'Review', true],
    [{ state: 'not_enrolled' }, 'View course', false],
    [{ state: 'unknown' }, 'Open course', false],
  ];

  it.each(cases)('renders the section-6 row for %o', async (enrollment, cta, hasProgress) => {
    const { container } = render(
      await PartnerHomeModule({
        partner: PARTNER,
        catalog: ok([item('a', enrollment)]),
        locale: 'en',
      }),
    );

    expect(screen.getByText(cta)).toBeInTheDocument();
    expect(container.querySelectorAll('[role="progressbar"]').length > 0).toBe(hasProgress);
  });

  it('never offers the not-enrolled CTA for an unknown enrollment', async () => {
    render(
      await PartnerHomeModule({
        partner: PARTNER,
        catalog: ok([item('a', { state: 'unknown' })]),
        locale: 'en',
      }),
    );

    expect(screen.queryByText('View course')).not.toBeInTheDocument();
    expect(screen.getByText('Open course')).toBeInTheDocument();
  });
});

describe('PartnerHomeModule — branding and locale', () => {
  it('scopes the partner accent to the module wrapper', async () => {
    const { container } = render(
      await PartnerHomeModule({ partner: PARTNER, catalog: ok([]), locale: 'en' }),
    );

    const section = container.querySelector('section');
    expect(section?.getAttribute('style')).toContain('#1a2b33');
  });

  it('sets the token override on exactly one element, so siblings cannot inherit it', async () => {
    // Non-leakage is structural: the vars live on the module's own <section>, so
    // the ?enrolled=true banner and every other sibling in the dashboard tree are
    // outside this scope and keep HonuVibe teal.
    const { container } = render(
      await PartnerHomeModule({ partner: PARTNER, catalog: ok([]), locale: 'en' }),
    );

    const overriding = [...container.querySelectorAll('[style]')].filter((el) =>
      (el.getAttribute('style') ?? '').includes('--accent-teal:'),
    );
    expect(overriding).toHaveLength(1);
    expect(overriding[0].tagName).toBe('SECTION');
  });

  it('falls back to the teal token when the accent failed the contrast bar', async () => {
    const { container } = render(
      await PartnerHomeModule({
        partner: { ...PARTNER, accent: null, accentSubtle: null },
        catalog: ok([]),
        locale: 'en',
      }),
    );

    const section = container.querySelector('section');
    expect(section?.getAttribute('style') ?? '').not.toContain('--accent-teal:');
  });

  it('renders JA copy and the JA course title on /ja', async () => {
    render(
      await PartnerHomeModule({
        partner: PARTNER,
        catalog: ok([item('a', { state: 'not_enrolled' })]),
        locale: 'ja',
      }),
    );

    expect(screen.getByText('Vertice Societyのホーム')).toBeInTheDocument();
    expect(screen.getByText('コースa')).toBeInTheDocument();
    expect(screen.getByText('コースを見る')).toBeInTheDocument();
  });
});

describe('PartnerIdentity — outside the module token scope', () => {
  it('paints the partner accent with NO module ancestor present', async () => {
    // The header/welcome case: these render outside PartnerHomeModule, where
    // --accent-teal is still HonuVibe teal, so the accent must be applied
    // directly rather than inherited.
    const { container } = render(<PartnerIdentity partner={PARTNER} />);

    const styled = [...container.querySelectorAll('[style]')].map((el) =>
      el.getAttribute('style'),
    );
    expect(styled.some(paintsAccent)).toBe(true);
  });

  it('falls back to the teal token when the accent is null', async () => {
    const { container } = render(
      <PartnerIdentity partner={{ ...PARTNER, accent: null }} />,
    );

    const styled = [...container.querySelectorAll('[style]')].map((el) =>
      el.getAttribute('style'),
    );
    expect(styled.some((s) => s?.includes('var(--accent-teal)'))).toBe(true);
  });

  it('renders a monogram that survives a surrogate-pair first character', () => {
    render(<PartnerIdentity partner={{ ...PARTNER, name: '𠮷野スタジオ', logoUrl: null }} />);
    expect(screen.getByText('𠮷')).toBeInTheDocument();
  });
});

describe('CommunityTile — label contract', () => {
  const base = { unreadReplies: 0, posts: [], locale: 'en' };

  it('uses the partner label only when a partnerName is supplied', async () => {
    render(await CommunityTile({ ...base, partnerName: 'Vertice Society' }));
    expect(screen.getByText('Vertice Society community')).toBeInTheDocument();
    expect(screen.queryByText('Community')).not.toBeInTheDocument();
  });

  it('falls back to the generic label when partnerName is null', async () => {
    // The deactivated-partner case: the feed is still partner-scoped, but the
    // page withholds the name because branding is absent, so the tile must not
    // claim a brand.
    render(await CommunityTile({ ...base, partnerName: null }));
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('falls back to the generic label when the prop is omitted entirely', async () => {
    render(await CommunityTile(base));
    expect(screen.getByText('Community')).toBeInTheDocument();
  });
});

describe('DashboardWelcomeHeader — non-partner regression', () => {
  it('renders exactly as today when no partner is passed (admin dashboard case)', () => {
    const { container: withoutProp } = render(
      <DashboardWelcomeHeader overlineDate="MONDAY, JUL 27, 2026" welcomeLabel="Welcome back" />,
    );
    const { container: withNull } = render(
      <DashboardWelcomeHeader
        overlineDate="MONDAY, JUL 27, 2026"
        welcomeLabel="Welcome back"
        partner={null}
      />,
    );

    expect(withoutProp.innerHTML).toBe(withNull.innerHTML);
    expect(withoutProp.querySelector('img')).toBeNull();
    expect(paintsAccent(withoutProp.innerHTML)).toBe(false);
  });

  it('carries the identity in BOTH welcome steps', () => {
    // The password step is what a brand-new join-code redeemer sees first, and
    // it is a separate return from the chooser — the shared WelcomeFrame is what
    // stops one of them being branded and the other not.
    const { unmount } = render(
      <WelcomeScreen displayName="Ada" locale="en" passwordSet={false} partner={PARTNER} />,
    );
    expect(screen.getByTestId('set-password-card')).toBeInTheDocument();
    expect(screen.getByText('Vertice Society')).toBeInTheDocument();
    unmount();

    render(<WelcomeScreen displayName="Ada" locale="en" passwordSet={true} partner={PARTNER} />);
    expect(screen.queryByTestId('set-password-card')).not.toBeInTheDocument();
    expect(screen.getByText('Vertice Society')).toBeInTheDocument();
  });

  it('shows no identity on either welcome step without a partner', () => {
    const { unmount } = render(
      <WelcomeScreen displayName="Ada" locale="en" passwordSet={false} />,
    );
    expect(screen.queryByText('Vertice Society')).not.toBeInTheDocument();
    unmount();

    render(<WelcomeScreen displayName="Ada" locale="en" passwordSet={true} />);
    expect(screen.queryByText('Vertice Society')).not.toBeInTheDocument();
  });

  it('adds the identity strip only when a partner is passed', () => {
    const { container } = render(
      <DashboardWelcomeHeader
        overlineDate="MONDAY, JUL 27, 2026"
        welcomeLabel="Welcome back"
        partner={PARTNER}
      />,
    );

    expect(screen.getByText('Vertice Society')).toBeInTheDocument();
    expect(paintsAccent(container.innerHTML)).toBe(true);
  });
});
