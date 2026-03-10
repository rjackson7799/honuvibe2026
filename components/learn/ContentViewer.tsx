'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ContentViewerProps = {
  url: string;
  contentType: string | null;
  title: string;
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

export function ContentViewer({ url, contentType, title }: ContentViewerProps) {
  // YouTube embed
  if (contentType === 'video_youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return (
        <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }
  }

  // Vimeo embed
  if (url.includes('vimeo.com')) {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return (
        <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }
  }

  // For articles, tools, and other types: show a card with "Open" button
  return (
    <div className="rounded-lg border border-border-primary bg-bg-tertiary p-4">
      <p className="text-sm text-fg-secondary mb-3">{title}</p>
      <Button
        variant="ghost"
        size="sm"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open in new tab
      </Button>
    </div>
  );
}
