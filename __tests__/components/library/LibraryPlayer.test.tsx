import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LibraryPlayer } from '@/components/library/LibraryPlayer';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/library/youtube', () => ({
  parseYouTubeVideoId: vi.fn((url: string) =>
    url.includes('youtube') ? 'dQw4w9WgXcQ' : null,
  ),
  buildEmbedUrl: vi.fn(() => 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&origin=https://honuvibe.ai'),
  loadYouTubeIframeAPI: vi.fn(() => Promise.resolve()),
  resolveThumbnail: vi.fn((thumb: string | null) => thumb),
  YT_STATE: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
}));

const mockPlayer = {
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 300),
  destroy: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockYTPlayer(this: any) {
  Object.assign(this, mockPlayer);
}

const baseProps = {
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  videoId: 'video-uuid-123',
  title: 'Test Video',
  thumbnailUrl: '/images/test.jpg',
  durationSeconds: 300,
  isAuthenticated: false,
  locale: 'en',
};

describe('LibraryPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.YT.Player so the useEffect doesn't throw
    (window as Window & { YT?: unknown }).YT = {
      Player: MockYTPlayer,
    };
  });

  afterEach(() => {
    delete (window as Window & { YT?: unknown }).YT;
  });

  it('renders thumbnail before play is clicked', () => {
    render(<LibraryPlayer {...baseProps} />);
    const img = screen.getByAltText('Test Video');
    expect(img).toBeInTheDocument();
  });

  it('renders play button before video starts', () => {
    render(<LibraryPlayer {...baseProps} />);
    expect(screen.getByLabelText('Play video')).toBeInTheDocument();
  });

  it('shows duration badge before play', () => {
    render(<LibraryPlayer {...baseProps} />);
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('shows YouTube iframe after play is clicked (YouTube URL)', async () => {
    render(<LibraryPlayer {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Play video'));
    // iframe should be present in DOM
    const iframe = await screen.findByTitle('Test Video');
    expect(iframe).toBeInTheDocument();
    expect((iframe as HTMLIFrameElement).src).toContain('youtube.com/embed');
  });

  it('does not show YouTube iframe for non-YouTube URL (fallback)', () => {
    render(<LibraryPlayer {...baseProps} videoUrl="https://placeholder.honuvibe.ai/video" />);
    fireEvent.click(screen.getByLabelText('Play video'));
    expect(screen.queryByTitle('Test Video')).not.toBeInTheDocument();
  });

  it('renders without thumbnail gracefully', () => {
    render(<LibraryPlayer {...baseProps} thumbnailUrl={null} />);
    expect(screen.getByLabelText('Play video')).toBeInTheDocument();
  });
});
