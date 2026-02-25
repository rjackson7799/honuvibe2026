import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { ViewedBadge } from './ViewedBadge';
import { FavoriteButton } from './FavoriteButton';
import type { LibraryVideoCardProps } from '@/lib/library/types';

function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

const categoryLabels: Record<string, string> = {
  'ai-basics': 'AI Basics',
  'coding-tools': 'Coding Tools',
  'business-automation': 'Business',
  'image-video': 'Image & Video',
  productivity: 'Productivity',
  'getting-started': 'Getting Started',
};

export function LibraryVideoCard({
  id,
  slug,
  title,
  thumbnailUrl,
  durationSeconds,
  category,
  difficulty,
  accessTier,
  isFeatured,
  isFavorited,
  isViewed,
  progressPercent,
  locale,
  isAuthenticated,
}: LibraryVideoCardProps) {
  const prefix = locale === 'ja' ? '/ja' : '';
  const href = `${prefix}/learn/library/${slug}`;

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-lg overflow-hidden',
        'bg-bg-secondary border',
        'transition-all duration-[var(--duration-normal)]',
        'hover:border-border-hover hover:shadow-sm',
        isFeatured ? 'border-accent-teal' : 'border-border-default',
      )}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-bg-tertiary flex items-center justify-center">
            <span className="text-fg-tertiary text-xs">No thumbnail</span>
          </div>
        )}

        {/* Duration badge — bottom left */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(durationSeconds)}
        </div>

        {/* Viewed badge — bottom right */}
        {isViewed && <ViewedBadge />}

        {/* Lock icon — center, for gated content when not authenticated */}
        {accessTier === 'free_account' && !isAuthenticated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Lock size={24} className="text-white/70" />
          </div>
        )}

        {/* Progress bar — bottom, for partially watched */}
        {progressPercent > 0 && progressPercent < 80 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-accent-teal"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
        <h3 className="font-sans text-sm font-medium text-fg-primary line-clamp-2 group-hover:text-accent-teal transition-colors">
          {title}
        </h3>

        {/* Metadata row */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-2">
            <Tag>{categoryLabels[category] || category}</Tag>
            <span className="text-xs text-fg-tertiary capitalize">{difficulty}</span>
          </div>
          {isAuthenticated && (
            <FavoriteButton
              videoId={id}
              isFavorited={isFavorited}
              locale={locale}
            />
          )}
          {!isAuthenticated && accessTier === 'open' && (
            <Tag color="var(--accent-teal)">Free</Tag>
          )}
        </div>
      </div>
    </Link>
  );
}
