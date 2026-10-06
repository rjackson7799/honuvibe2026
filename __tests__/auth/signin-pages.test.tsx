import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { stubMatchMedia } from '../marketing/hv/helpers';

const nav = vi.hoisted(() => ({
  pathname: '/signin',
  replace: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  search: '',
}));

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  role: 'student' as string | null,
}));

vi.mock('next-intl', async () => {
  const { makeTranslations } = await import('../helpers/intl-mock');
  return {
    useLocale: () => 'en',
    useTranslations: (ns?: string) => makeTranslations(ns),
  };
});

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => nav.pathname,
  useRouter: () => nav,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => nav,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: auth.signInWithPassword,
      signInWithOAuth: vi.fn(),
      setSession: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: auth.role ? { role: auth.role } : null }) }),
      }),
    }),
  }),
}));

import { AuthSplitLayout, modeFromPath } from '@/components/auth/AuthSplitLayout';

const quotes = [
  { text: 'Quote one', name: 'A', org: 'Org A' },
  { text: 'Quote two', name: 'B', org: 'Org B' },
];

function setUrl(path: string, search = '') {
  nav.pathname = path;
  nav.search = search;
  window.history.replaceState({}, '', `${path}${search}`);
}

describe('/signin and /signup split layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubMatchMedia(false);
    auth.role = 'student';
    setUrl('/signin');
  });

  it('renders sign-in mode copy on /signin', () => {
    render(<AuthSplitLayout quotes={quotes} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Back to the Vault' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Sign in to HonuVibe' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('Full Name')).toBeNull();
  });

  it('renders sign-up mode copy and the name field on /signup', () => {
    setUrl('/signup');
    render(<AuthSplitLayout quotes={quotes} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Join the Vault' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Create your free account' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign up' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create free account/ })).toBeInTheDocument();
  });

  it('switching tabs router.replaces to the other route and keeps ?redirect', () => {
    setUrl('/signin', '?redirect=%2Flearn%2Fdashboard');
    render(<AuthSplitLayout quotes={quotes} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'kai@example.com' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }));

    expect(nav.replace).toHaveBeenCalledWith('/signup?redirect=%2Flearn%2Fdashboard', { scroll: false });
    // Copy flips immediately and the typed email survives the switch.
    expect(screen.getByRole('heading', { level: 1, name: 'Join the Vault' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('kai@example.com');
  });

  it('the switch-mode link moves to sign up as well', () => {
    render(<AuthSplitLayout quotes={quotes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Join for free' }));
    expect(nav.replace).toHaveBeenCalledWith('/signup', { scroll: false });
  });

  it('password field has a Show / Hide toggle', () => {
    render(<AuthSplitLayout quotes={quotes} />);
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveTextContent('Hide');
  });

  it('shows the magic-link option in sign-in mode unless showMagicLink is off', () => {
    const { unmount } = render(<AuthSplitLayout quotes={quotes} />);
    expect(screen.getByRole('button', { name: 'Email me a sign-in link instead' })).toBeInTheDocument();
    unmount();
    render(<AuthSplitLayout quotes={quotes} showMagicLink={false} />);
    expect(screen.queryByRole('button', { name: 'Email me a sign-in link instead' })).toBeNull();
  });

  it('defaultMode decides the mode off the auth routes', () => {
    expect(modeFromPath('/somewhere', 'sign-up')).toBe('sign-up');
    expect(modeFromPath('/signin', 'sign-up')).toBe('sign-in');
    expect(modeFromPath('/signup/', 'sign-in')).toBe('sign-up');
  });

  it('a partner signing in with no ?redirect lands on /portal', async () => {
    auth.role = 'partner';
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    render(<AuthSplitLayout quotes={quotes} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'p@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign in/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/portal'));
  });

  it('ignores an off-site ?redirect after password sign-in', async () => {
    setUrl('/signin', '?redirect=https%3A%2F%2Fevil.example%2Flogin');
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    render(<AuthSplitLayout quotes={quotes} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 's@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign in/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/learn/dashboard'));
  });

  it('honours a safe ?redirect after password sign-in', async () => {
    setUrl('/signin', '?redirect=%2Fjoin%2FABCD2345');
    auth.role = 'partner';
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    render(<AuthSplitLayout quotes={quotes} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'p@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sign in/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/join/ABCD2345'));
  });

  it('gives the small auth controls 44px targets', () => {
    render(<AuthSplitLayout quotes={quotes} />);
    expect(screen.getByRole('button', { name: 'Forgot password?' }).className).toContain('min-h-[44px]');
    expect(screen.getByRole('button', { name: 'Show password' }).className).toContain('min-h-[44px]');
  });

  it('keeps the carousel still and dot-driven under reduced motion', () => {
    stubMatchMedia(true);
    render(<AuthSplitLayout quotes={quotes} />);
    expect(document.querySelector('[aria-roledescription="carousel"]')).toHaveAttribute('data-rotating', 'false');
  });
});
