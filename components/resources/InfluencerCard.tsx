'use client';

import { cn } from '@/lib/utils';
import { Tag } from '@/components/ui/tag';
import { PlatformIcon } from './PlatformIcon';
import { trackEvent } from '@/lib/analytics';

type InfluencerCardProps = {
  name: string;
  description: string;
  avatarUrl?: string;
  platforms: Array<{ platform: string; url: string }>;
  specialty?: string;
  locale: string;
  followLabel: string;
};

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-12 h-12 rounded-full bg-accent-teal/20 flex items-center justify-center text-accent-teal font-medium text-sm shrink-0">
      {initials}
    </div>
  );
}

export function InfluencerCard({
  name,
  description,
  avatarUrl,
  platforms,
  specialty,
  locale,
  followLabel,
}: InfluencerCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg p-4 md:p-5',
        'bg-bg-secondary border border-border-default',
        'transition-all duration-[var(--duration-normal)]',
        'hover:border-border-hover hover:shadow-sm',
      )}
    >
      {/* Header: Avatar + Name + Specialty */}
      <div className="flex items-start gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <AvatarFallback name={name} />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-sans text-base font-medium text-fg-primary">{name}</h3>
          {specialty && <Tag className="mt-1">{specialty}</Tag>}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-fg-secondary line-clamp-2">{description}</p>

      {/* Platform links */}
      {platforms && platforms.length > 0 && (
        <div className="flex items-center gap-2 mt-auto pt-1">
          {platforms.map((p) => (
            <a
              key={p.platform}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${followLabel} ${p.platform}`}
              className="p-1.5 rounded text-fg-tertiary hover:text-accent-teal transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() =>
                trackEvent('influencer_click', { influencer_name: name, platform: p.platform, locale })
              }
            >
              <PlatformIcon platform={p.platform} size={20} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
