# Library YouTube Player Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the simulated LibraryPlayer with a real YouTube IFrame embed and wire 15 curated YouTube video URLs into the seed/migration SQL.

**Architecture:** A `lib/library/youtube.ts` utility parses YouTube URLs and loads the IFrame API as a singleton. `LibraryPlayer` stays thumbnail-first — the iframe only mounts after the user clicks Play. Progress tracking uses the existing `/api/library/progress` API via IFrame API state/polling.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, YouTube IFrame Player API (no npm package — loaded via dynamic script tag), Vitest + Testing Library

---

## Task 1: Create `lib/library/youtube.ts`

**Files:**
- Create: `lib/library/youtube.ts`
- Test: `__tests__/lib/library/youtube.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/lib/library/youtube.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseYouTubeVideoId, buildEmbedUrl } from '@/lib/library/youtube';

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
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/lib/library/youtube.test.ts
```
Expected: FAIL — module not found

**Step 3: Implement `lib/library/youtube.ts`**

```typescript
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
    if (typeof window !== 'undefined' && (window as Window & { YT?: { Player: unknown } }).YT?.Player) {
      resolve();
      return;
    }

    // YT calls this global when the API is ready
    (window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = resolve;

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
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/library/youtube.test.ts
```
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add lib/library/youtube.ts __tests__/lib/library/youtube.test.ts
git commit -m "feat(library): add YouTube URL parser and IFrame API loader utility"
```

---

## Task 2: Write tests for the upgraded LibraryPlayer

**Files:**
- Create: `__tests__/components/library/LibraryPlayer.test.tsx`

**Background:** The current `LibraryPlayer` has no test. We write the test FIRST before touching the implementation.

**Step 1: Write the failing tests**

Create `__tests__/components/library/LibraryPlayer.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  YT_STATE: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
}));

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
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/components/library/LibraryPlayer.test.tsx
```
Expected: Tests related to iframe fail (component currently shows simulated player)

**Step 3: Commit the tests**

```bash
git add __tests__/components/library/LibraryPlayer.test.tsx
git commit -m "test(library): add LibraryPlayer tests for YouTube embed behavior"
```

---

## Task 3: Upgrade `LibraryPlayer` to use the YouTube IFrame API

**Files:**
- Modify: `components/library/LibraryPlayer.tsx`

**Step 1: Replace the component**

Rewrite `components/library/LibraryPlayer.tsx` in full:

```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import {
  parseYouTubeVideoId,
  buildEmbedUrl,
  loadYouTubeIframeAPI,
  YT_STATE,
  type YTPlayer,
  type YTOnStateChangeEvent,
} from '@/lib/library/youtube';

type LibraryPlayerProps = {
  videoUrl: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  isAuthenticated: boolean;
  locale: string;
};

const PROGRESS_THRESHOLDS = [25, 50, 75, 80];

export function LibraryPlayer({
  videoUrl,
  videoId,
  title,
  thumbnailUrl,
  durationSeconds,
  isAuthenticated,
  locale,
}: LibraryPlayerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);

  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0); // mirrors progress state — safe for sendBeacon on unmount
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportedRef = useRef<Set<number>>(new Set());
  const lastReportRef = useRef(0);
  const destroyedRef = useRef(false);

  const youtubeVideoId = parseYouTubeVideoId(videoUrl);
  const embedUrl = youtubeVideoId ? buildEmbedUrl(youtubeVideoId) : null;

  const reportProgress = useCallback(
    async (percent: number) => {
      if (!isAuthenticated) return;
      const now = Date.now();
      if (now - lastReportRef.current < 10000) return;
      lastReportRef.current = now;
      try {
        await fetch('/api/library/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: videoId, progress_percent: percent }),
        });
      } catch {
        // Silent fail
      }
    },
    [isAuthenticated, videoId],
  );

  const checkThresholds = useCallback(
    (percent: number) => {
      for (const threshold of PROGRESS_THRESHOLDS) {
        if (percent >= threshold && !reportedRef.current.has(threshold)) {
          reportedRef.current.add(threshold);
          reportProgress(percent);
          if (threshold === 80) {
            trackEvent('library_video_complete', { video_slug: videoId, locale });
          }
        }
      }
    },
    [reportProgress, videoId, locale],
  );

  const startPolling = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player) return;
      const duration = player.getDuration();
      const current = player.getCurrentTime();
      if (duration > 0) {
        const pct = Math.min((current / duration) * 100, 100);
        setProgress(pct);
        progressRef.current = pct;
        checkThresholds(pct);
      }
    }, 1000);
  }, [checkThresholds]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initialize YT player when user clicks Play (YouTube path only)
  useEffect(() => {
    if (!hasStarted || !embedUrl || !iframeContainerRef.current) return;

    destroyedRef.current = false;

    loadYouTubeIframeAPI().then(() => {
      if (destroyedRef.current || !iframeContainerRef.current) return;

      const YT = (window as Window & { YT: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer } }).YT;

      ytPlayerRef.current = new YT.Player(iframeContainerRef.current, {
        videoId: youtubeVideoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (event: YTOnStateChangeEvent) => {
            if (event.data === YT_STATE.PLAYING) {
              startPolling();
            } else if (event.data === YT_STATE.PAUSED || event.data === YT_STATE.ENDED) {
              stopPolling();
            }
          },
        },
      });
    });

    return () => {
      destroyedRef.current = true;
      stopPolling();
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
    };
    // youtubeVideoId and embedUrl are derived from videoUrl — stable for component lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);

  // Simulated fallback timer (non-YouTube URLs)
  useEffect(() => {
    if (!hasStarted || embedUrl) return; // skip if YouTube or not started
    const intervalMs = 1000;
    const increment = durationSeconds > 0 ? 100 / durationSeconds : 0;
    const id = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + increment, 100);
        progressRef.current = next;
        checkThresholds(next);
        if (next >= 100) clearInterval(id);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [hasStarted, embedUrl, durationSeconds, checkThresholds]);

  // Send final progress on unmount using progressRef (avoids stale closure)
  useEffect(() => {
    return () => {
      if (isAuthenticated && progressRef.current > 0 && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/library/progress',
          JSON.stringify({ video_id: videoId, progress_percent: Math.round(progressRef.current) }),
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = () => {
    setHasStarted(true);
    trackEvent('library_video_play', { video_slug: videoId, locale });
  };

  const minutes = Math.ceil(durationSeconds / 60);

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-bg-tertiary" style={{ aspectRatio: '16/9' }}>
      {/* Phase 1: Before play — show thumbnail */}
      {!hasStarted && (
        <>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-fg-tertiary text-sm">{title}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center group"
            aria-label="Play video"
          >
            <div className="w-16 h-16 rounded-full bg-accent-teal/90 flex items-center justify-center shadow-lg group-hover:bg-accent-teal transition-colors">
              <Play size={28} className="text-white ml-1" />
            </div>
          </button>
          <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {minutes} min
          </div>
        </>
      )}

      {/* Phase 2: After play */}
      {hasStarted && embedUrl && (
        // YouTube iframe — div is replaced by YT.Player constructor
        <div ref={iframeContainerRef} className="absolute inset-0 w-full h-full">
          {/* YT.Player mounts here; also serves as fallback iframe */}
          <iframe
            title={title}
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      {/* Phase 2 fallback: simulated player (non-YouTube URL) */}
      {hasStarted && !embedUrl && (
        <>
          {thumbnailUrl && (
            <img src={thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-fg-secondary text-sm">Playing: {title}</span>
          </div>
        </>
      )}

      {/* Progress bar (both modes) */}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            className="h-full bg-accent-teal transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Run all library tests**

```bash
pnpm test __tests__/components/library/
```
Expected: All tests pass including the new LibraryPlayer tests

**Step 3: Run full test suite**

```bash
pnpm test
```
Expected: All tests pass (no regressions)

**Step 4: Commit**

```bash
git add components/library/LibraryPlayer.tsx
git commit -m "feat(library): upgrade LibraryPlayer to use YouTube IFrame API"
```

---

## Task 4: Update seed SQL and add migration with real YouTube URLs

**Files:**
- Modify: `supabase/seed_library_videos.sql`
- Create: `supabase/migrations/006_update_video_urls.sql`

**Background:** The 15 curated YouTube videos below are from official channels and reputable educators. **Ryan: verify each URL is live and the content matches before running the migration.**

### Curated Video Selections

| # | Slug | Suggested Video (verify before use) |
|---|---|---|
| 1 | setting-up-cursor-with-claude | Fireship "Cursor AI Tutorial" or Cursor official |
| 2 | first-ai-chat-claude-vs-chatgpt | Dave Ebbelaar "Claude vs ChatGPT vs Gemini" |
| 3 | ai-image-generators-midjourney-dalle | Midjourney official or Matt Wolfe image gen overview |
| 4 | how-to-write-better-prompts | Anthropic official prompting video or Lilian Weng |
| 5 | ai-tools-small-business | Greg Isenberg or AI Advantage "AI for business" |
| 6 | connecting-claude-google-sheets | Make.com official "Claude + Google Sheets" |
| 7 | first-automation-n8n | N8N official "Build your first workflow" |
| 8 | ai-email-writing-templates | Loom or HubSpot "AI email writing" |
| 9 | free-supabase-database-setup | Supabase official "Getting Started in 5 minutes" |
| 10 | deploying-website-vercel | Vercel official "Deploy in 2 minutes" |
| 11 | ai-social-media-content | Jasper or Copy.ai official social media content |
| 12 | introduction-to-mcp | Anthropic official MCP announcement/explanation |
| 13 | ai-video-generation-runway | Runway official ML tutorial |
| 14 | automating-client-onboarding | Zapier "Automate client onboarding" or Make.com |
| 15 | idea-to-prototype-ai | Fireship "Vibe Coding" or similar AI building tutorial |

**Step 1: Update `supabase/seed_library_videos.sql`**

Replace ONLY the `video_url` values in the 15 INSERT rows. Example pattern for each:

```sql
-- BEFORE:
'https://placeholder.honuvibe.ai/videos/cursor-setup'

-- AFTER (substitute real verified YouTube URL):
'https://www.youtube.com/watch?v=VERIFIED_ID_HERE'
```

Replace all 15 placeholder URLs. Keep all other seed data unchanged.

**Step 2: Create `supabase/migrations/006_update_video_urls.sql`**

```sql
-- Migration: Update library_videos with real YouTube URLs
-- Run AFTER verifying each URL is live.
-- Generated: 2026-02-25

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_1', updated_at = now()
  WHERE slug = 'setting-up-cursor-with-claude';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_2', updated_at = now()
  WHERE slug = 'first-ai-chat-claude-vs-chatgpt';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_3', updated_at = now()
  WHERE slug = 'ai-image-generators-midjourney-dalle';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_4', updated_at = now()
  WHERE slug = 'how-to-write-better-prompts';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_5', updated_at = now()
  WHERE slug = 'ai-tools-small-business';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_6', updated_at = now()
  WHERE slug = 'connecting-claude-google-sheets';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_7', updated_at = now()
  WHERE slug = 'first-automation-n8n';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_8', updated_at = now()
  WHERE slug = 'ai-email-writing-templates';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_9', updated_at = now()
  WHERE slug = 'free-supabase-database-setup';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_10', updated_at = now()
  WHERE slug = 'deploying-website-vercel';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_11', updated_at = now()
  WHERE slug = 'ai-social-media-content';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_12', updated_at = now()
  WHERE slug = 'introduction-to-mcp';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_13', updated_at = now()
  WHERE slug = 'ai-video-generation-runway';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_14', updated_at = now()
  WHERE slug = 'automating-client-onboarding';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=VERIFIED_ID_15', updated_at = now()
  WHERE slug = 'idea-to-prototype-ai';
```

**Step 3: Commit**

```bash
git add supabase/seed_library_videos.sql supabase/migrations/006_update_video_urls.sql
git commit -m "feat(library): add real YouTube URLs to seed data and migration"
```

---

## Task 5: End-to-end verification

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Test open-tier video playback**

Visit `http://localhost:3000/learn/library/setting-up-cursor-with-claude`

- [ ] Thumbnail visible before play
- [ ] Click Play → YouTube iframe loads, video autoplays
- [ ] Video controls (scrubbing, fullscreen) work
- [ ] Progress bar at bottom updates as video plays

**Step 3: Test progress tracking (requires login)**

- Sign in at `/auth/login`
- Watch a video past 80%
- Check Supabase table `user_library_progress`:
  ```sql
  SELECT * FROM user_library_progress WHERE video_id = '<id>';
  ```
  Expected: `completed = true`, `progress_percent >= 80`

**Step 4: Test access gate (free_account tier)**

Sign out, visit `/learn/library/connecting-claude-google-sheets`
Expected: AccessGate shown (not the player)

**Step 5: Test non-YouTube fallback**

Temporarily set a `video_url` to `https://vimeo.com/123456` via admin UI at `/admin/library`.
Click Play on that video's page.
Expected: Fallback "Playing: [title]" text shown (no crash, no empty div)

**Step 6: Check SEO JSON-LD**

View source of any video page. Find the `<script type="application/ld+json">` block.
Expected: `"contentUrl": "https://www.youtube.com/watch?v=..."` — real URL, not placeholder.

**Step 7: Run production build**

```bash
pnpm build
```
Expected: Zero TypeScript errors, zero build errors

---

## Summary: Files Changed

| File | Action |
|---|---|
| `lib/library/youtube.ts` | Create |
| `__tests__/lib/library/youtube.test.ts` | Create |
| `__tests__/components/library/LibraryPlayer.test.tsx` | Create |
| `components/library/LibraryPlayer.tsx` | Rewrite |
| `supabase/seed_library_videos.sql` | Update (placeholder URLs → YouTube) |
| `supabase/migrations/006_update_video_urls.sql` | Create |

**No changes needed:** API routes, types, page components, other library components, next.config.ts
