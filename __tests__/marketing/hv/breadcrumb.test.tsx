import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HvBreadcrumb } from '@/components/marketing/hv/breadcrumb';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('HvBreadcrumb', () => {
  it('links every item but the last, which is the current page', () => {
    render(
      <HvBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Learn', href: '/learn' },
          { label: 'AI Essentials', href: '/learn/ai-essentials' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
    expect(screen.queryByRole('link', { name: 'AI Essentials' })).toBeNull();
    expect(screen.getByText('AI Essentials')).toHaveAttribute('aria-current', 'page');
  });

  it('uses the light ink set on sand surfaces', () => {
    render(<HvBreadcrumb tone="light" items={[{ label: 'Home', href: '/' }, { label: 'Build' }]} />);
    expect(screen.getByRole('link', { name: 'Home' }).className).toContain('text-hv-ink-500');
    expect(screen.getByText('Build').className).toContain('text-hv-green-900');
  });
});
