import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HvButton } from '@/components/marketing/hv/button';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-intl-link="true" {...rest}>
      {children}
    </a>
  ),
}));

describe('HvButton', () => {
  it('defaults to the amber primary CTA at md size', () => {
    render(<HvButton>Go</HvButton>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.className).toContain('bg-hv-amber');
    expect(btn.className).toContain('text-hv-green-900');
    expect(btn.className).toContain('min-h-[50px]');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('hero size is the 54px primary button', () => {
    render(<HvButton size="hero">Go</HvButton>);
    expect(screen.getByRole('button').className).toContain('min-h-[54px]');
  });

  it('outline-dark is transparent with the green-600 border', () => {
    render(<HvButton variant="outline-dark">Go</HvButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).toContain('border-hv-green-600');
  });

  it('text-link variants drop the box sizing', () => {
    render(<HvButton variant="link-amber">Go</HvButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('px-');
    expect(btn.className).toContain('text-hv-amber');
  });

  it('appends the arrow glyph when asked', () => {
    render(<HvButton arrow>Go</HvButton>);
    expect(screen.getByRole('button').textContent).toBe('Go→');
  });

  it('routes internal hrefs through the locale-aware Link', () => {
    render(<HvButton href="/learn">Learn</HvButton>);
    const link = screen.getByRole('link', { name: 'Learn' });
    expect(link).toHaveAttribute('href', '/learn');
    expect(link).toHaveAttribute('data-intl-link', 'true');
  });

  it('renders a plain anchor for external and hash hrefs', () => {
    render(
      <>
        <HvButton href="https://studio.honuvibe.ai">Studio</HvButton>
        <HvButton href="#brief">Brief</HvButton>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Studio' })).not.toHaveAttribute('data-intl-link');
    expect(screen.getByRole('link', { name: 'Brief' })).not.toHaveAttribute('data-intl-link');
  });

  it('keeps an explicit submit type', () => {
    render(<HvButton type="submit">Send</HvButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
