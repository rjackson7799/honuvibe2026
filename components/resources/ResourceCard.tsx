'use client';

import { cn } from '@/lib/utils';
import { Tag } from '@/components/ui/tag';
import { trackEvent } from '@/lib/analytics';
import { ArrowUpRight, Play, BookOpen } from 'lucide-react';

type ResourceCardProps = {
  name: string;
  description: string;
  logoUrl?: string;
  category: string;
  pricing: 'free' | 'freemium' | 'paid';
  url: string;
  relatedLibraryVideoSlug?: string;
  relatedCourseSlug?: string;
  isFeatured?: boolean;
  locale: string;
  categoryLabel: string;
  pricingLabel: string;
  visitLabel: string;
  tutorialLabel: string;
  courseLabel: string;
};

const pricingColors: Record<string, string> = {
  free: 'var(--accent-teal)',
  freemium: 'var(--accent-gold)',
  paid: '',
};

function LogoFallback({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded bg-accent-teal/20 flex items-center justify-center text-accent-teal font-medium text-sm shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ResourceCard({
  name,
  description,
  logoUrl,
  category,
  pricing,
  url,
  relatedLibraryVideoSlug,
  relatedCourseSlug,
  isFeatured,
  locale,
  categoryLabel,
  pricingLabel,
  visitLabel,
  tutorialLabel,
  courseLabel,
}: ResourceCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg p-4 md:p-5',
        'bg-bg-secondary border',
        'transition-all duration-[var(--duration-normal)]',
        'hover:border-border-hover hover:shadow-sm',
        isFeatured ? 'border-accent-teal' : 'border-border-default',
      )}
    >
      {/* Header: Logo + Name + Pricing */}
      <div className="flex items-start gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            width={40}
            height={40}
            className="w-10 h-10 rounded object-contain shrink-0"
          />
        ) : (
          <LogoFallback name={name} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-sans text-base font-medium text-fg-primary">{name}</h3>
            <Tag color={pricingColors[pricing] || undefined}>{pricingLabel}</Tag>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-fg-secondary line-clamp-2">{description}</p>

      {/* Footer: Category + Links */}
      <div className="flex items-center gap-3 flex-wrap mt-auto pt-1">
        <Tag>{categoryLabel}</Tag>

        <div className="flex items-center gap-3 ml-auto">
          {relatedCourseSlug && (
            <a
              href={`/${locale === 'ja' ? 'ja/' : ''}learn/${relatedCourseSlug}`}
              className="inline-flex items-center gap-1 text-sm text-accent-gold hover:underline"
              onClick={() =>
                trackEvent('resource_course_click', { resource_name: name, course_slug: relatedCourseSlug, locale })
              }
            >
              <BookOpen size={14} />
              {courseLabel}
            </a>
          )}

          {relatedLibraryVideoSlug && (
            <a
              href={`/${locale === 'ja' ? 'ja/' : ''}learn/library/${relatedLibraryVideoSlug}`}
              className="inline-flex items-center gap-1 text-sm text-accent-teal hover:underline"
              onClick={() =>
                trackEvent('resource_tutorial_click', {
                  resource_name: name,
                  video_slug: relatedLibraryVideoSlug,
                  locale,
                })
              }
            >
              <Play size={14} />
              {tutorialLabel}
            </a>
          )}

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} website`}
            className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-accent-teal transition-colors"
            onClick={() => trackEvent('resource_click', { resource_name: name, category, locale })}
          >
            {visitLabel}
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
