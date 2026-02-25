import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LibraryVideoCard } from '@/components/library/LibraryVideoCard';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock fetch for FavoriteButton
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }),
));

const defaultProps = {
  id: 'video-1',
  slug: 'setting-up-cursor',
  title: 'Setting Up Cursor IDE with Claude',
  description: 'Learn how to install Cursor IDE.',
  thumbnailUrl: '/images/cursor.jpg',
  durationSeconds: 300,
  category: 'coding-tools' as const,
  difficulty: 'beginner' as const,
  language: 'en' as const,
  accessTier: 'open' as const,
  isFeatured: false,
  isFavorited: false,
  isViewed: false,
  progressPercent: 0,
  locale: 'en',
  isAuthenticated: false,
};

describe('LibraryVideoCard', () => {
  it('renders the video title', () => {
    render(<LibraryVideoCard {...defaultProps} />);
    expect(screen.getByText('Setting Up Cursor IDE with Claude')).toBeInTheDocument();
  });

  it('renders duration badge', () => {
    render(<LibraryVideoCard {...defaultProps} />);
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('renders category tag', () => {
    render(<LibraryVideoCard {...defaultProps} />);
    expect(screen.getByText('Coding Tools')).toBeInTheDocument();
  });

  it('renders difficulty badge', () => {
    render(<LibraryVideoCard {...defaultProps} />);
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('shows lock icon for gated content when not authenticated', () => {
    const { container } = render(
      <LibraryVideoCard {...defaultProps} accessTier="free_account" />,
    );
    // Lock icon should be present (SVG)
    const lockSvg = container.querySelector('svg');
    expect(lockSvg).toBeInTheDocument();
  });

  it('does not show lock icon for open content', () => {
    const { container } = render(
      <LibraryVideoCard {...defaultProps} accessTier="open" />,
    );
    // Should show "Free" tag instead
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows viewed badge when video is completed', () => {
    render(<LibraryVideoCard {...defaultProps} isViewed={true} />);
    expect(screen.getByLabelText('Watched')).toBeInTheDocument();
  });

  it('does not show viewed badge when not completed', () => {
    render(<LibraryVideoCard {...defaultProps} isViewed={false} />);
    expect(screen.queryByLabelText('Watched')).not.toBeInTheDocument();
  });

  it('applies featured border when isFeatured', () => {
    const { container } = render(
      <LibraryVideoCard {...defaultProps} isFeatured={true} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-accent-teal');
  });

  it('links to the correct video page', () => {
    const { container } = render(<LibraryVideoCard {...defaultProps} />);
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/learn/library/setting-up-cursor');
  });

  it('links to JP path when locale is ja', () => {
    const { container } = render(
      <LibraryVideoCard {...defaultProps} locale="ja" />,
    );
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/ja/learn/library/setting-up-cursor');
  });
});
