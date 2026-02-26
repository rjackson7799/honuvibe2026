// YouTube URL parsing and IFrame API utilities
// No npm package required — uses the YouTube IFrame Player API loaded via script tag.

// Minimal type definitions for the YouTube IFrame Player API
export interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
}

export interface YTPlayerEvent {
  target: YTPlayer;
}

export interface YTOnStateChangeEvent {
  target: YTPlayer;
  data: number;
}

export type YTPlayerStateCode = 0 | 1 | 2 | 3 | 5 | -1;

export const YT_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  VIDEO_CUED: 5,
  UNSTARTED: -1,
} as const;

// Singleton promise — avoids loading the script more than once
let apiReadyPromise: Promise<void> | null = null;

export function loadYouTubeIframeAPI(): Promise<void> {
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise<void>((resolve) => {
    // Already loaded (e.g. during hot reload)
    if (typeof window !== 'undefined' && (window as unknown as { YT?: { Player: unknown } }).YT?.Player) {
      resolve();
      return;
    }

    // YT calls this global when the API is ready
    (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = resolve;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });

  return apiReadyPromise;
}

/**
 * Parses a YouTube URL and extracts the video ID.
 * Supports: youtu.be/{id}, youtube.com/watch?v={id}, youtube.com/embed/{id}
 * Returns null for non-YouTube URLs (enables graceful fallback to simulated player).
 */
export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // youtu.be/{id}
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return id.length === 11 ? id : null;
    }
    // youtube.com/watch?v={id} or youtube.com/embed/{id}
    if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/embed/')[1]?.split('?')[0];
        return id && id.length === 11 ? id : null;
      }
      const v = parsed.searchParams.get('v');
      return v && v.length === 11 ? v : null;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Builds the YouTube embed URL with the IFrame API enabled.
 */
export function buildEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=https://honuvibe.ai`;
}
