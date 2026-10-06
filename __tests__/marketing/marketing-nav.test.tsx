import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

const nav = vi.hoisted(() => ({
  locale: 'en',
  pathname: '/learn',
  replace: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock('next-intl', async () => {
  const { makeTranslations } = await import('../helpers/intl-mock');
  return {
    useLocale: () => nav.locale,
    useTranslations: (ns?: string) => makeTranslations(ns),
  };
});

// Locale-aware Link stand-in: prefixes /ja like next-intl's Link does, so the
// test can tell it apart from the plain anchor used for API routes.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={nav.locale === 'ja' ? `/ja${href}` : href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => nav.pathname,
  useRouter: () => nav,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => (nav.locale === 'ja' ? `/ja${nav.pathname}` : nav.pathname),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      // Never settles: the user menu stays in its loading state, which keeps
      // its async session load (covered in marketing-user-menu.test) out of
      // these header tests.
      getSession: () => new Promise(() => {}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: () => Promise.resolve({ error: null }),
    },
  }),
}));

import { MarketingNavClient } from '@/components/marketing/nav/marketing-nav-client';
import { NAV_CTA_HREF, PRIMARY_NAV_LINKS, isActiveNavHref } from '@/components/marketing/nav/nav-cta';

const links = PRIMARY_NAV_LINKS.map((l) => ({ href: l.href, label: l.key[0].toUpperCase() + l.key.slice(1) }));
const userMenuLabels = { signIn: 'Sign in', account: 'Account', dashboard: 'Dashboard', admin: 'Admin', signOut: 'Sign out' };
const labels = { primary: 'Main', language: 'Language', openMenu: 'Open menu', closeMenu: 'Close menu', menu: 'Menu' };

function renderNav(cta: { href: string; label: string } | null) {
  return render(
    <MarketingNavClient links={links} cta={cta} userMenuLabels={userMenuLabels} labels={labels} bannerEvent={null} />,
  );
}

describe('MarketingNavClient', () => {
  beforeEach(() => {
    nav.locale = 'en';
    nav.pathname = '/learn';
    vi.clearAllMocks();
  });

  it('shows Learn · Build · Partner in that order', () => {
    renderNav(null);
    const primary = screen.getByRole('navigation', { name: 'Main' });
    expect(within(primary).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/learn',
      '/build',
      '/partner',
    ]);
  });

  it('renders the page CTA with its label and href', () => {
    renderNav({ href: NAV_CTA_HREF.start_project, label: 'Start a project' });
    expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute('href', '/build#brief');
  });

  it('defaults to Get started free → /signup in the CTA map', () => {
    expect(NAV_CTA_HREF.get_started_free).toBe('/signup');
    expect(NAV_CTA_HREF.talk_to_us).toBe('/partner#apply');
  });

  it('hides the CTA when cta is null', () => {
    renderNav(null);
    expect(screen.queryByRole('link', { name: 'Get started free' })).toBeNull();
  });

  it('sends the Join the Vault CTA to the API route without a /ja prefix, carrying locale=ja', () => {
    nav.locale = 'ja';
    renderNav({ href: NAV_CTA_HREF.join_vault, label: 'Join the Vault' });
    expect(screen.getByRole('link', { name: 'Join the Vault' })).toHaveAttribute(
      'href',
      '/api/stripe/subscribe?tier=vault&locale=ja',
    );
  });

  it('marks the current section active, including child paths', () => {
    nav.pathname = '/learn/ai-essentials';
    renderNav(null);
    const primary = screen.getByRole('navigation', { name: 'Main' });
    expect(within(primary).getByRole('link', { name: 'Learn' })).toHaveAttribute('aria-current', 'page');
    expect(within(primary).getByRole('link', { name: 'Partner' })).not.toHaveAttribute('aria-current');
  });

  it('does not treat /partners/<slug> as the Partner section', () => {
    expect(isActiveNavHref('/partners/vertice-society', '/partner')).toBe(false);
    expect(isActiveNavHref('/partner/', '/partner')).toBe(true);
  });

  it('has no theme toggle', () => {
    renderNav(null);
    expect(screen.queryByRole('button', { name: /theme|dark|light/i })).toBeNull();
  });

  it('opens the mobile sheet and closes it on Escape, returning focus', () => {
    renderNav({ href: '/signup', label: 'Get started free' });
    const opener = screen.getByRole('button', { name: 'Open menu' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(dialog).getByRole('link', { name: 'Get started free' })).toHaveAttribute('href', '/signup');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
  });
});
