'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';

type VaultVideoPlayerProps = {
  embedUrl: string;
  title: string;
};

function getYouTubeEmbedUrl(url: string): string {
  // Convert watch URLs to embed URLs
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}?enablejsapi=1`;
  }
  return url;
}

export function VaultVideoPlayer({ embedUrl, title }: VaultVideoPlayerProps) {
  const src = getYouTubeEmbedUrl(embedUrl);
  const hasTrackedPlay = useRef(false);

  useEffect(() => {
    // Track video play on first interaction with iframe
    function handleMessage(event: MessageEvent) {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'onStateChange' && data.info === 1 && !hasTrackedPlay.current) {
            hasTrackedPlay.current = true;
            trackEvent('vault_video_play', { title });
          }
          if (data.event === 'onStateChange' && data.info === 0) {
            trackEvent('vault_video_complete', { title });
          }
        } catch {
          // Not a YouTube message
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [title]);

  return (
    <div className="aspect-[16/9] rounded-lg overflow-hidden bg-bg-tertiary">
      <iframe
        src={src}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
