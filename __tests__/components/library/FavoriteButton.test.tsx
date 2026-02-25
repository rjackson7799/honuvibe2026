import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FavoriteButton } from '@/components/library/FavoriteButton';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }),
);
vi.stubGlobal('fetch', mockFetch);

const defaultProps = {
  videoId: 'test-video-123',
  isFavorited: false,
  locale: 'en',
  ariaLabelAdd: 'Add to favorites',
  ariaLabelRemove: 'Remove from favorites',
};

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with "Add to favorites" label when not favorited', () => {
    render(<FavoriteButton {...defaultProps} />);
    expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
  });

  it('renders with "Remove from favorites" label when favorited', () => {
    render(<FavoriteButton {...defaultProps} isFavorited={true} />);
    expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
  });

  it('calls fetch on click', async () => {
    render(<FavoriteButton {...defaultProps} />);
    const button = screen.getByLabelText('Add to favorites');
    fireEvent.click(button);

    expect(mockFetch).toHaveBeenCalledWith('/api/library/favorite', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('has minimum 44x44 touch target', () => {
    const { container } = render(<FavoriteButton {...defaultProps} />);
    const button = container.querySelector('button') as HTMLElement;
    expect(button.className).toContain('min-w-[44px]');
    expect(button.className).toContain('min-h-[44px]');
  });
});
