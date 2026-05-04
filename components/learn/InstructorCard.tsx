import Image from 'next/image';
import type { InstructorCardData } from '@/lib/instructors/types';

type InstructorCardProps = {
  instructor: InstructorCardData | null;
  fallbackName: string | null;
  locale: string;
};

export function InstructorCard({ instructor, fallbackName, locale }: InstructorCardProps) {
  if (!instructor && !fallbackName) return null;

  if (instructor) {
    const title = locale === 'ja' && instructor.title_jp
      ? instructor.title_jp
      : instructor.title_en;

    const bio = locale === 'ja'
      ? (instructor.bio_long_jp || instructor.bio_short_jp || instructor.bio_long_en || instructor.bio_short_en)
      : (instructor.bio_long_en || instructor.bio_short_en);

    return (
      <div className="flex items-start gap-3 sm:gap-4 bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-lg)] p-5 sm:p-6 shadow-[var(--m-shadow-xs)]">
        <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden bg-[var(--m-canvas)]">
          {instructor.photo_url ? (
            <Image
              src={instructor.photo_url}
              alt={instructor.display_name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--m-ink-tertiary)] text-lg font-bold">
              {instructor.display_name[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-bold text-[var(--m-ink-primary)] tracking-[-0.01em]">
            {instructor.display_name}
          </p>
          {title && (
            <p className="text-sm font-semibold text-[var(--m-accent-teal)] mt-0.5">{title}</p>
          )}
          {bio && (
            <p className="text-sm text-[var(--m-ink-secondary)] mt-2 leading-relaxed">{bio}</p>
          )}
          {instructor.website_url && (
            <a
              href={instructor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--m-ink-tertiary)] hover:text-[var(--m-accent-teal)] transition-colors mt-2 inline-block"
            >
              {instructor.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[var(--m-canvas)] border border-[var(--m-border-default)]" />
      <div>
        <p className="font-bold text-[var(--m-ink-primary)]">{fallbackName}</p>
        <a
          href={locale === 'ja' ? '/ja/about' : '/about'}
          className="text-sm text-[var(--m-accent-teal)] hover:underline"
        >
          {locale === 'ja' ? '詳しく見る →' : 'Learn more →'}
        </a>
      </div>
    </div>
  );
}
