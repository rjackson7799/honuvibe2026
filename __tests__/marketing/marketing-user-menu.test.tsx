import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MarketingUserMenu,
  type MarketingUserMenuLabels,
} from '@/components/marketing/nav/marketing-user-menu';

type Session = {
  user: {
    id: string;
    email: string;
    user_metadata?: { full_name?: string; name?: string };
  };
} | null;

let currentSession: Session = null;
let currentRole: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
    onClick,
    role,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    role?: string;
  }) => (
    <a href={href} className={className} onClick={onClick} role={role}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: currentSession } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: currentRole ? { role: currentRole } : null,
            }),
        }),
      }),
    }),
  }),
}));

const labels: MarketingUserMenuLabels = {
  signIn: 'Student Login',
  account: 'Account',
  dashboard: 'Dashboard',
  admin: 'Admin',
  signOut: 'Sign out',
};

describe('MarketingUserMenu', () => {
  beforeEach(() => {
    currentSession = null;
    currentRole = null;
  });

  it('renders the Sign In pill linking to /learn/auth when logged out', async () => {
    render(<MarketingUserMenu labels={labels} />);
    const label = await screen.findByText('Student Login');
    const anchor = label.closest('a');
    expect(anchor?.getAttribute('href')).toBe('/learn/auth');
    expect(screen.queryByRole('button', { name: 'Account' })).not.toBeInTheDocument();
  });

  it('renders an avatar button with the user initial when logged in', async () => {
    currentSession = {
      user: {
        id: 'u-1',
        email: 'jane@example.com',
        user_metadata: { full_name: 'Jane Aloha' },
      },
    };
    currentRole = 'student';

    render(<MarketingUserMenu labels={labels} />);
    const button = await screen.findByRole('button', { name: 'Account' });
    expect(button.textContent).toBe('J');
    expect(screen.queryByText('Student Login')).not.toBeInTheDocument();
  });

  it('opens a dropdown with Dashboard + Sign out (no Admin) for non-admin users', async () => {
    currentSession = {
      user: {
        id: 'u-1',
        email: 'jane@example.com',
        user_metadata: { full_name: 'Jane Aloha' },
      },
    };
    currentRole = 'student';

    render(<MarketingUserMenu labels={labels} />);
    const button = await screen.findByRole('button', { name: 'Account' });
    fireEvent.click(button);

    const dashboard = screen.getByText('Dashboard').closest('a');
    expect(dashboard?.getAttribute('href')).toBe('/learn/dashboard');
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('renders the Admin link in the dropdown when the user has the admin role', async () => {
    currentSession = {
      user: {
        id: 'u-2',
        email: 'admin@example.com',
        user_metadata: { name: 'Admin User' },
      },
    };
    currentRole = 'admin';

    render(<MarketingUserMenu labels={labels} />);
    const button = await screen.findByRole('button', { name: 'Account' });
    fireEvent.click(button);

    const adminLink = screen.getByText('Admin').closest('a');
    expect(adminLink?.getAttribute('href')).toBe('/admin');
  });
});
