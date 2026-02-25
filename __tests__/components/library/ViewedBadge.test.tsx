import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ViewedBadge } from '@/components/library/ViewedBadge';

describe('ViewedBadge', () => {
  it('renders with default aria-label', () => {
    render(<ViewedBadge />);
    expect(screen.getByLabelText('Watched')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<ViewedBadge label="Completed" />);
    expect(screen.getByLabelText('Completed')).toBeInTheDocument();
  });

  it('has the correct accent color class', () => {
    const { container } = render(<ViewedBadge />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-accent-teal');
    expect(badge.className).toContain('rounded-full');
  });
});
