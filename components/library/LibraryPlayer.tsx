'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import {
  parseYouTubeVideoId,
  buildEmbedUrl,
  loadYouTubeIframeAPI,
  resolveThumbnail,
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
  const resolvedThumbnail = resolveThumbnail(thumbnailUrl, videoUrl);

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

      const YT = (window as unknown as { YT: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer } }).YT;

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
          {resolvedThumbnail ? (
            <img src={resolvedThumbnail} alt={title} className="absolute inset-0 w-full h-full object-cover" />
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
          {resolvedThumbnail && (
            <img src={resolvedThumbnail} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
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
