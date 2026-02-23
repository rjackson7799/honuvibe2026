import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResourceCard } from '@/components/resources/ResourceCard';

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

const defaultProps = {
  name: 'Cursor',
  description: 'The AI-native code editor I build everything in.',
  category: 'build',
  pricing: 'freemium' as const,
  url: 'https://cursor.com',
  locale: 'en',
  categoryLabel: 'Build',
  pricingLabel: 'Freemium',
  visitLabel: 'Visit',
  tutorialLabel: 'Watch Tutorial',
  courseLabel: 'Used in Course',
};

describe('ResourceCard', () => {
  it('renders the tool name and description', () => {
    render(<ResourceCard {...defaultProps} />);
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('The AI-native code editor I build everything in.')).toBeInTheDocument();
  });

  it('renders pricing and category tags', () => {
    render(<ResourceCard {...defaultProps} />);
    expect(screen.getByText('Freemium')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
  });

  it('renders visit link with correct attributes', () => {
    render(<ResourceCard {...defaultProps} />);
    const visitLink = screen.getByLabelText('Cursor website');
    expect(visitLink).toHaveAttribute('href', 'https://cursor.com');
    expect(visitLink).toHaveAttribute('target', '_blank');
    expect(visitLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render tutorial link when slug is not provided', () => {
    render(<ResourceCard {...defaultProps} />);
    expect(screen.queryByText('Watch Tutorial')).not.toBeInTheDocument();
  });

  it('renders tutorial link when slug is provided', () => {
    render(<ResourceCard {...defaultProps} relatedLibraryVideoSlug="cursor-intro" />);
    expect(screen.getByText('Watch Tutorial')).toBeInTheDocument();
  });

  it('does not render course link when slug is not provided', () => {
    render(<ResourceCard {...defaultProps} />);
    expect(screen.queryByText('Used in Course')).not.toBeInTheDocument();
  });

  it('renders course link when slug is provided', () => {
    render(<ResourceCard {...defaultProps} relatedCourseSlug="ai-foundations" />);
    expect(screen.getByText('Used in Course')).toBeInTheDocument();
  });

  it('applies featured border class when isFeatured', () => {
    const { container } = render(<ResourceCard {...defaultProps} isFeatured />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-accent-teal');
  });

  it('does not apply featured border when not featured', () => {
    const { container } = render(<ResourceCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-border-default');
  });

  it('renders logo fallback when no logoUrl provided', () => {
    render(<ResourceCard {...defaultProps} />);
    expect(screen.getByText('C')).toBeInTheDocument(); // First letter of "Cursor"
  });
});
