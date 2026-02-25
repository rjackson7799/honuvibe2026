'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

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
  videoId,
  title,
  thumbnailUrl,
  durationSeconds,
  isAuthenticated,
  locale,
}: LibraryPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportedRef = useRef<Set<number>>(new Set());
  const lastReportRef = useRef(0);

  const reportProgress = useCallback(
    async (percent: number) => {
      if (!isAuthenticated) return;
      // Throttle: don't report more than once per 10 seconds
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
        // Silent fail for progress tracking
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
            trackEvent('library_video_complete', {
              video_slug: videoId,
              locale,
            });
          }
        }
      }
    },
    [reportProgress, videoId, locale],
  );

  // Simulated playback timer (placeholder — replace with real player events)
  useEffect(() => {
    if (playing && durationSeconds > 0) {
      const intervalMs = 1000;
      const incrementPerTick = (100 / durationSeconds);

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = Math.min(prev + incrementPerTick, 100);
          checkThresholds(next);
          if (next >= 100) {
            setPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return next;
        });
      }, intervalMs);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, durationSeconds, checkThresholds]);

  // Report final progress on unmount
  useEffect(() => {
    return () => {
      if (isAuthenticated && progress > 0) {
        // Use sendBeacon for reliability on page leave
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/library/progress',
            JSON.stringify({ video_id: videoId, progress_percent: Math.round(progress) }),
          );
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = () => {
    if (!hasStarted) {
      setHasStarted(true);
      trackEvent('library_video_play', {
        video_slug: videoId,
        locale,
      });
    }
    setPlaying(!playing);
  };

  const minutes = Math.ceil(durationSeconds / 60);

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-bg-tertiary" style={{ aspectRatio: '16/9' }}>
      {/* Thumbnail / Player area */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-fg-tertiary text-sm">Video: {title}</span>
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        className="absolute inset-0 flex items-center justify-center group"
        aria-label={playing ? 'Pause video' : 'Play video'}
      >
        {!playing && (
          <div className="w-16 h-16 rounded-full bg-accent-teal/90 flex items-center justify-center shadow-lg group-hover:bg-accent-teal transition-colors">
            <Play size={28} className="text-white ml-1" />
          </div>
        )}
        {playing && (
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Pause size={20} className="text-white" />
          </div>
        )}
      </button>

      {/* Duration badge */}
      {!hasStarted && (
        <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {minutes} min
        </div>
      )}

      {/* Progress bar */}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            className="h-full bg-accent-teal transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Placeholder label */}
      {playing && (
        <div className="absolute top-3 right-3 bg-accent-teal/90 text-white text-xs px-2 py-1 rounded">
          Simulated Playback
        </div>
      )}
    </div>
  );
}
