import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DifficultyBadge } from '@/components/glossary/DifficultyBadge';

describe('DifficultyBadge', () => {
  it('renders the label text for beginner', () => {
    render(<DifficultyBadge difficulty="beginner" label="Beginner" />);
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('renders the label text for intermediate', () => {
    render(<DifficultyBadge difficulty="intermediate" label="Intermediate" />);
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });

  it('renders the label text for advanced', () => {
    render(<DifficultyBadge difficulty="advanced" label="Advanced" />);
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('applies teal color for beginner', () => {
    const { container } = render(<DifficultyBadge difficulty="beginner" label="Beginner" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.borderColor).toBe('var(--accent-teal)');
    expect(badge.style.color).toBe('var(--accent-teal)');
  });

  it('applies gold color for intermediate', () => {
    const { container } = render(<DifficultyBadge difficulty="intermediate" label="Intermediate" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.borderColor).toBe('var(--accent-gold)');
    expect(badge.style.color).toBe('var(--accent-gold)');
  });

  it('applies no inline color for advanced (uses default Tag)', () => {
    const { container } = render(<DifficultyBadge difficulty="advanced" label="Advanced" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.color).toBe('');
  });
});
