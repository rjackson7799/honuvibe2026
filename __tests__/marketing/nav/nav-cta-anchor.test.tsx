import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

const nav = vi.hoisted(() => ({ locale: 'en', nextLink: vi.fn() }));

vi.mock('next-intl', () => ({ useLocale: () => nav.locale }));
vi.mock('next/link', () => ({
  default: (props: { href: string; children: ReactNode }) => {
    nav.nextLink(props);
    return <a href={props.href}>{props.children}</a>;
  },
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a data-locale-link href={nav.locale === 'ja' ? `/ja${href}` : href} {...rest}>
      {children}
    </a>
  ),
}));

import { NavCtaAnchor } from '@/components/marketing/nav/nav-cta-anchor';
import { apiHrefForLocale } from '@/components/marketing/nav/nav-cta';

beforeEach(() => {
  nav.locale = 'en';
  nav.nextLink.mockClear();
});

describe('NavCtaAnchor', () => {
  it('cta /api/stripe/subscribe?tier=vault renders a plain anchor', () => {
    nav.locale = 'ja';
    const href = '/api/stripe/subscribe?tier=vault';
    render(<NavCtaAnchor cta={{ href, label: 'Join the Vault' }} />);
    const link = screen.getByRole('link', { name: 'Join the Vault' });
    expect(link).toHaveAttribute('href', apiHrefForLocale(href, 'ja'));
    expect(link).not.toHaveAttribute('data-locale-link');
    // A client-side Next navigation to an API route strands the click.
    expect(nav.nextLink).not.toHaveBeenCalled();
  });

  it('/learn cta still uses the locale Link', () => {
    nav.locale = 'ja';
    render(<NavCtaAnchor cta={{ href: '/learn', label: 'Learn' }} />);
    const link = screen.getByRole('link', { name: 'Learn' });
    expect(link).toHaveAttribute('data-locale-link');
    expect(link).toHaveAttribute('href', '/ja/learn');
  });
});
