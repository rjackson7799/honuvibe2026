import { describe, it, expect } from 'vitest';
import { parseYouTubeVideoId, buildEmbedUrl, getYouTubeThumbnailUrl, resolveThumbnail } from '@/lib/library/youtube';

describe('parseYouTubeVideoId', () => {
  it('parses youtu.be short URL', () => {
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses youtube.com watch URL', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses youtube.com embed URL', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses URL with extra query params', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(parseYouTubeVideoId('https://vimeo.com/123456')).toBeNull();
  });

  it('returns null for placeholder URL', () => {
    expect(parseYouTubeVideoId('https://placeholder.honuvibe.ai/videos/cursor-setup')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseYouTubeVideoId('')).toBeNull();
  });
});

describe('buildEmbedUrl', () => {
  it('builds embed URL with JS API enabled', () => {
    expect(buildEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&origin=https://honuvibe.ai',
    );
  });
});

describe('getYouTubeThumbnailUrl', () => {
  it('returns hqdefault thumbnail by default', () => {
    expect(getYouTubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('supports custom quality', () => {
    expect(getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'maxresdefault')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    );
  });
});

describe('resolveThumbnail', () => {
  it('returns YouTube thumbnail when thumbnailUrl is a local placeholder', () => {
    const result = resolveThumbnail('/images/library/cursor-setup.jpg', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('returns custom thumbnail when not a local placeholder', () => {
    const result = resolveThumbnail('https://cdn.example.com/thumb.jpg', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toBe('https://cdn.example.com/thumb.jpg');
  });

  it('returns YouTube thumbnail when thumbnailUrl is null', () => {
    const result = resolveThumbnail(null, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('returns null when no thumbnail and non-YouTube URL', () => {
    const result = resolveThumbnail(null, 'https://vimeo.com/123');
    expect(result).toBeNull();
  });
});
