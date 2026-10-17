import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LangPills } from '@/components/learn/LangPills';

const nav = vi.hoisted(() => ({ locale: 'ja', pathname: '/learn/dashboard' }));

vi.mock('next-intl', () => ({ useLocale: () => nav.locale }));
// next-intl's navigation module can't load under vitest (next/navigation ESM
// resolution), so getPathname is stubbed with its as-needed behavior: the default
// locale is unprefixed, every other locale gets /<locale>.
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => nav.pathname,
  getPathname: ({ href, locale }: { href: string; locale: string }) =>
    locale === 'en' ? href : `/${locale}${href}`,
}));

const replace = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  replace.mockClear();
  nav.locale = 'ja';
  nav.pathname = '/learn/dashboard';
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, search: '?welcome=true', hash: '#top', replace },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  document.cookie = 'NEXT_LOCALE=;max-age=0;path=/';
});

describe('LangPills', () => {
  // A soft router.replace across the [locale] root layout only refreshed the page
  // segment on the dynamic dashboard, leaving the JA shell around an EN body.
  it('switches to English with a full document navigation to the unprefixed path', () => {
    render(<LangPills />);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(replace).toHaveBeenCalledWith('/learn/dashboard?welcome=true#top');
    expect(document.cookie).toContain('NEXT_LOCALE=en');
  });

  it('switches to Japanese with the /ja prefix', () => {
    nav.locale = 'en';
    nav.pathname = '/learn/dashboard/my-classes';
    render(<LangPills />);
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    expect(replace).toHaveBeenCalledWith('/ja/learn/dashboard/my-classes?welcome=true#top');
    expect(document.cookie).toContain('NEXT_LOCALE=ja');
  });

  it('does nothing when the active locale is clicked', () => {
    render(<LangPills />);
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    expect(replace).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('NEXT_LOCALE');
  });

  it('ignores a second click while the navigation is in flight', () => {
    render(<LangPills />);
    const en = screen.getByRole('button', { name: 'EN' });
    fireEvent.click(en);
    fireEvent.click(en);
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
