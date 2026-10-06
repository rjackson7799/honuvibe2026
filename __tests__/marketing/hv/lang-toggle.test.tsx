import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({
  locale: 'en',
  pathname: '/signin',
  replace: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock('next-intl', () => ({ useLocale: () => nav.locale }));
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => nav,
}));

import { HvLangToggle } from '@/components/marketing/hv/lang-toggle';

describe('HvLangToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.locale = 'en';
    nav.pathname = '/signin';
    window.history.replaceState({}, '', '/signin?redirect=%2Flearn%2Fdashboard#access_token=x');
  });

  it('renders two segments with the active locale pressed', () => {
    render(<HvLangToggle label="Language" />);
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '日本語' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches locale keeping the query string and hash', () => {
    render(<HvLangToggle label="Language" tone="light" />);
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    expect(nav.replace).toHaveBeenCalledWith('/signin?redirect=%2Flearn%2Fdashboard#access_token=x', {
      locale: 'ja',
      scroll: false,
    });
    expect(document.cookie).toContain('NEXT_LOCALE=ja');
  });

  it('does nothing when the active locale is clicked', () => {
    render(<HvLangToggle label="Language" />);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('does not submit a surrounding form', () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(e) => submit(e.nativeEvent)}>
        <HvLangToggle label="Language" />
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    expect(submit).not.toHaveBeenCalled();
  });
});
