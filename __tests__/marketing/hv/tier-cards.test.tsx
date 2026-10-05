import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HvTierCard, HvTierGrid } from '@/components/marketing/hv/tier-cards';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const base = {
  name: 'Build',
  tagline: 'Database-driven sites',
  price: { prefix: 'from', amount: '$1,500' },
  features: ['A site built on your own data', 'Two rounds of changes'],
  cta: { label: 'Brief a Build project', href: '#brief' },
};

describe('HvTierCard', () => {
  it('popular tier is the dark card with badge, amber checks and amber CTA', () => {
    const { container } = render(<HvTierCard {...base} popular badge="Most projects" />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.dataset.popular).toBe('true');
    expect(card.className).toContain('bg-hv-green-900');
    expect(screen.getByText('Most projects')).toBeInTheDocument();
    expect(card.querySelector('li span[aria-hidden]')?.className).toContain('text-hv-amber');
    expect(screen.getByRole('link', { name: /Brief a Build project/ }).className).toContain('bg-hv-amber');
  });

  it('a standard tier is the light card with green checks and a dark CTA', () => {
    const { container } = render(<HvTierCard {...base} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('bg-hv-sand-50');
    expect(screen.queryByText('Most projects')).toBeNull();
    expect(card.querySelector('li span[aria-hidden]')?.className).toContain('text-hv-green-600');
    expect(screen.getByRole('link').className).toContain('bg-hv-green-900');
  });

  it('renders prefix, amount and unit, and hides the price when showPrice is false', () => {
    const { rerender } = render(<HvTierCard {...base} price={{ prefix: 'from', amount: '$59', unit: '/ seat / month' }} />);
    expect(screen.getByText('from')).toBeInTheDocument();
    expect(screen.getByText('$59')).toBeInTheDocument();
    expect(screen.getByText('/ seat / month')).toBeInTheDocument();
    rerender(<HvTierCard {...base} price={{ amount: '$59' }} showPrice={false} />);
    expect(screen.queryByText('$59')).toBeNull();
  });

  it('CTA without href renders a button and forwards onClick', () => {
    const onClick = vi.fn();
    render(<HvTierCard {...base} cta={{ label: 'Pick', onClick }} />);
    screen.getByRole('button', { name: /Pick/ }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('HvTierGrid lays cards out with the auto-fit grid', () => {
    const { container } = render(
      <HvTierGrid>
        <HvTierCard {...base} />
      </HvTierGrid>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain('auto-fit');
  });
});
