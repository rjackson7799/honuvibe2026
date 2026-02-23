import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { urlForImage } from '@/lib/sanity/image';
import type { Author } from '@/lib/sanity/types';

type AuthorBioProps = {
  author?: Author;
};

const defaultAuthor: Author = {
  name: 'Ryan Jackson',
  bio: 'Founder & AI Educator at HonuVibe.AI. Building Hawaii\'s bridge to the global AI ecosystem.',
};

export function AuthorBio({ author }: AuthorBioProps) {
  const t = useTranslations('blog');
  const displayAuthor = author?.name ? author : defaultAuthor;

  const imageUrl = displayAuthor.image?.asset
    ? urlForImage(displayAuthor.image).width(80).height(80).format('webp').url()
    : null;

  return (
    <div className="border-t border-border-default pt-8 mt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-teal mb-4">
        {t('author_bio_heading')}
      </p>
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={displayAuthor.name}
            width={56}
            height={56}
            className="rounded-full shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-bg-tertiary shrink-0 flex items-center justify-center text-fg-tertiary text-lg font-serif">
            {displayAuthor.name.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-medium text-fg-primary">{displayAuthor.name}</p>
          {displayAuthor.bio && (
            <p className="text-sm text-fg-secondary leading-relaxed mt-1">{displayAuthor.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}
