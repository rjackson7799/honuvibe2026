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

  it('applies the marketing teal palette class for beginner', () => {
    render(<DifficultyBadge difficulty="beginner" label="Beginner" />);
    const badge = screen.getByText('Beginner');
    expect(badge.className).toContain('--m-accent-teal-soft');
    expect(badge.className).toContain('--m-accent-teal-dark');
  });

  it('applies the marketing coral palette class for intermediate', () => {
    render(<DifficultyBadge difficulty="intermediate" label="Intermediate" />);
    const badge = screen.getByText('Intermediate');
    expect(badge.className).toContain('--m-accent-coral-soft');
    expect(badge.className).toContain('--m-accent-coral-dark');
  });

  it('applies the neutral sand palette class for advanced', () => {
    render(<DifficultyBadge difficulty="advanced" label="Advanced" />);
    const badge = screen.getByText('Advanced');
    expect(badge.className).toContain('--m-sand');
    expect(badge.className).toContain('--m-ink-tertiary');
  });
});
