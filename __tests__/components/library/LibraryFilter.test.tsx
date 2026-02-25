import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LibraryFilter } from '@/components/library/LibraryFilter';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

const categories = [
  { value: 'all', label: 'All' },
  { value: 'ai-basics', label: 'AI Basics' },
  { value: 'coding-tools', label: 'Coding Tools' },
];

const defaultProps = {
  categories,
  activeCategory: 'all',
  onCategoryChange: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  locale: 'en',
};

describe('LibraryFilter', () => {
  it('renders all category pills', () => {
    render(<LibraryFilter {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('AI Basics')).toBeInTheDocument();
    expect(screen.getByText('Coding Tools')).toBeInTheDocument();
  });

  it('highlights the active category', () => {
    render(<LibraryFilter {...defaultProps} activeCategory="ai-basics" />);
    const activeButton = screen.getByText('AI Basics');
    expect(activeButton.className).toContain('text-accent-teal');
  });

  it('calls onCategoryChange when a pill is clicked', () => {
    const onCategoryChange = vi.fn();
    render(<LibraryFilter {...defaultProps} onCategoryChange={onCategoryChange} />);
    fireEvent.click(screen.getByText('Coding Tools'));
    expect(onCategoryChange).toHaveBeenCalledWith('coding-tools');
  });

  it('renders search input', () => {
    render(<LibraryFilter {...defaultProps} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn();
    render(<LibraryFilter {...defaultProps} onSearchChange={onSearchChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'cursor' } });
    expect(onSearchChange).toHaveBeenCalledWith('cursor');
  });

  it('search input has 16px minimum font size', () => {
    render(<LibraryFilter {...defaultProps} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.style.fontSize).toBe('16px');
  });

  it('category pills have minimum 44px height', () => {
    render(<LibraryFilter {...defaultProps} />);
    const pill = screen.getByText('All');
    expect(pill.className).toContain('min-h-[44px]');
  });
});
