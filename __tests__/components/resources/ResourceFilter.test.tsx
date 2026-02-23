import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResourceFilter } from '@/components/resources/ResourceFilter';

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

const categories = [
  { value: 'all', label: 'All' },
  { value: 'build', label: 'Build' },
  { value: 'create', label: 'Create' },
  { value: 'learn', label: 'Learn' },
];

describe('ResourceFilter', () => {
  it('renders all category pills', () => {
    render(
      <ResourceFilter categories={categories} activeCategory="all" onCategoryChange={() => {}} locale="en" />,
    );
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
  });

  it('calls onCategoryChange when a pill is clicked', () => {
    const onChange = vi.fn();
    render(
      <ResourceFilter categories={categories} activeCategory="all" onCategoryChange={onChange} locale="en" />,
    );
    fireEvent.click(screen.getByText('Build'));
    expect(onChange).toHaveBeenCalledWith('build');
  });

  it('applies active styling to the active category', () => {
    render(
      <ResourceFilter categories={categories} activeCategory="build" onCategoryChange={() => {}} locale="en" />,
    );
    const buildButton = screen.getByText('Build');
    expect(buildButton.className).toContain('text-accent-teal');
  });

  it('applies inactive styling to non-active categories', () => {
    render(
      <ResourceFilter categories={categories} activeCategory="build" onCategoryChange={() => {}} locale="en" />,
    );
    const allButton = screen.getByText('All');
    expect(allButton.className).toContain('text-fg-secondary');
  });
});
