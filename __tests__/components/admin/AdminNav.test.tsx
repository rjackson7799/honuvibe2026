import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminNav, ADMIN_NAV_COLLAPSED_KEY } from '@/components/admin/AdminNav';

let currentPath = '/admin';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// The bottom controls pull in Supabase/auth wiring — stub them out.
vi.mock('@/components/layout/lang-toggle', () => ({
  LangToggle: () => <div data-testid="lang-toggle" />,
}));
vi.mock('@/components/layout/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));
vi.mock('@/components/ui/honuvibe-wordmark', () => ({
  HonuVibeWordmark: () => <div data-testid="wordmark" />,
}));

/** The desktop sidebar only — the mobile strip repeats every label flat. */
function sidebar() {
  return screen.getByTestId('admin-sidebar');
}

function toggleFor(group: string) {
  return screen.getByRole('button', { name: new RegExp(`^${group}`) });
}

/** Links stay mounted when collapsed (so aria-controls resolves); visibility is the signal. */
function sidebarLink(label: string) {
  const link = Array.from(sidebar().querySelectorAll('a')).find(
    (a) => a.textContent?.trim() === label,
  );
  if (!link) throw new Error(`No sidebar link labelled "${label}"`);
  return link;
}

describe('AdminNav collapsible groups', () => {
  beforeEach(() => {
    currentPath = '/admin';
    window.localStorage.clear();
  });

  it('renders every group expanded by default', () => {
    render(<AdminNav />);
    for (const group of ['Overview', 'Learning', 'Members', 'Studio', 'Community', 'Content', 'Finance', 'Settings']) {
      expect(toggleFor(group)).toHaveAttribute('aria-expanded', 'true');
    }
    expect(sidebarLink('Courses')).toBeVisible();
  });

  it('collapses a group on click and hides its links', () => {
    render(<AdminNav />);
    fireEvent.click(toggleFor('Learning'));

    expect(toggleFor('Learning')).toHaveAttribute('aria-expanded', 'false');
    expect(sidebarLink('Courses')).not.toBeVisible();
    // Other groups are unaffected.
    expect(toggleFor('Members')).toHaveAttribute('aria-expanded', 'true');
    expect(sidebarLink('Students')).toBeVisible();
  });

  it('re-expands a collapsed group on a second click', () => {
    render(<AdminNav />);
    fireEvent.click(toggleFor('Learning'));
    fireEvent.click(toggleFor('Learning'));

    expect(toggleFor('Learning')).toHaveAttribute('aria-expanded', 'true');
    expect(sidebarLink('Courses')).toBeVisible();
  });

  it('persists collapsed groups to localStorage', () => {
    render(<AdminNav />);
    fireEvent.click(toggleFor('Learning'));
    fireEvent.click(toggleFor('Studio'));

    expect(JSON.parse(window.localStorage.getItem(ADMIN_NAV_COLLAPSED_KEY) ?? '[]')).toEqual([
      'Learning',
      'Studio',
    ]);

    fireEvent.click(toggleFor('Learning'));
    expect(JSON.parse(window.localStorage.getItem(ADMIN_NAV_COLLAPSED_KEY) ?? '[]')).toEqual([
      'Studio',
    ]);
  });

  it('restores collapsed groups from localStorage on mount', async () => {
    window.localStorage.setItem(ADMIN_NAV_COLLAPSED_KEY, JSON.stringify(['Members']));
    await act(async () => {
      render(<AdminNav />);
    });

    expect(toggleFor('Members')).toHaveAttribute('aria-expanded', 'false');
    expect(sidebarLink('Students')).not.toBeVisible();
    expect(toggleFor('Learning')).toHaveAttribute('aria-expanded', 'true');
  });

  it('ignores malformed localStorage and stays expanded', async () => {
    window.localStorage.setItem(ADMIN_NAV_COLLAPSED_KEY, '{not json');
    await act(async () => {
      render(<AdminNav />);
    });
    expect(toggleFor('Learning')).toHaveAttribute('aria-expanded', 'true');
  });

  it('marks a collapsed group that contains the active page', () => {
    currentPath = '/admin/courses/abc';
    render(<AdminNav />);

    expect(screen.queryByTestId('nav-group-active-dot')).not.toBeInTheDocument();
    fireEvent.click(toggleFor('Learning'));
    expect(screen.getByTestId('nav-group-active-dot')).toBeInTheDocument();

    // A collapsed group without the active page gets no dot.
    fireEvent.click(toggleFor('Studio'));
    expect(screen.getAllByTestId('nav-group-active-dot')).toHaveLength(1);
  });

  it('keeps the controlled panel mounted so aria-controls always resolves', () => {
    render(<AdminNav />);
    const toggle = toggleFor('Learning');
    const panelId = toggle.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    expect(panel).toBeVisible();
    fireEvent.click(toggle);
    expect(document.getElementById(panelId!)).toBe(panel);
    expect(panel).not.toBeVisible();
  });

  it('does not overwrite stored state with the default before it has been read', async () => {
    window.localStorage.setItem(ADMIN_NAV_COLLAPSED_KEY, JSON.stringify(['Finance']));
    await act(async () => {
      render(<AdminNav />);
    });
    expect(JSON.parse(window.localStorage.getItem(ADMIN_NAV_COLLAPSED_KEY) ?? '[]')).toEqual([
      'Finance',
    ]);
  });

  it('keeps the mobile strip flat and unaffected by collapsing', () => {
    render(<AdminNav />);
    fireEvent.click(toggleFor('Learning'));
    const mobile = screen.getByTestId('admin-mobile-nav');
    expect(Array.from(mobile.querySelectorAll('a')).some((a) => a.textContent?.trim() === 'Courses')).toBe(true);
  });
});
