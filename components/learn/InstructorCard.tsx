import Image from 'next/image';
import type { InstructorCardData } from '@/lib/instructors/types';

type InstructorCardProps = {
  instructor: InstructorCardData | null;
  fallbackName: string | null;
  locale: string;
};

export function InstructorCard({ instructor, fallbackName, locale }: InstructorCardProps) {
  if (!instructor && !fallbackName) return null;

  // Rich card with profile data
  if (instructor) {
    const title = locale === 'ja' && instructor.title_jp
      ? instructor.title_jp
      : instructor.title_en;

    const bio = locale === 'ja'
      ? (instructor.bio_long_jp || instructor.bio_short_jp || instructor.bio_long_en || instructor.bio_short_en)
      : (instructor.bio_long_en || instructor.bio_short_en);

    return (
      <div className="flex items-start gap-4 bg-bg-secondary border border-border-default rounded-lg p-5">
        {/* Avatar */}
        <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden bg-bg-tertiary">
          {instructor.photo_url ? (
            <Image
              src={instructor.photo_url}
              alt={instructor.display_name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-fg-tertiary text-lg font-serif">
              {instructor.display_name[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-serif text-lg text-fg-primary">{instructor.display_name}</p>
          {title && (
            <p className="text-sm text-accent-teal mt-0.5">{title}</p>
          )}
          {bio && (
            <p className="text-sm text-fg-secondary mt-2 leading-relaxed">{bio}</p>
          )}
          {instructor.website_url && (
            <a
              href={instructor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-fg-tertiary hover:text-accent-teal transition-colors mt-2 inline-block"
            >
              {instructor.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>
    );
  }

  // Fallback: plain text instructor name (no profile linked)
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-bg-tertiary" />
      <div>
        <p className="font-medium text-fg-primary">{fallbackName}</p>
        <a
          href={locale === 'ja' ? '/ja/about' : '/about'}
          className="text-sm text-accent-teal hover:underline"
        >
          {locale === 'ja' ? '詳しく見る →' : 'Learn more →'}
        </a>
      </div>
    </div>
  );
}
