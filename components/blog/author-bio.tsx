import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Overline } from '@/components/marketing/primitives/overline';
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
    <div className="border-t border-[var(--m-border-soft)] pt-8 mt-10">
      <Overline tone="teal" className="mb-4">{t('author_bio_heading')}</Overline>
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={displayAuthor.name}
            width={56}
            height={56}
            className="rounded-full shrink-0 ring-2 ring-[var(--m-border-soft)]"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[var(--m-sand)] border border-[var(--m-border-soft)] shrink-0 flex items-center justify-center text-[var(--m-ink-secondary)] text-lg font-bold">
            {displayAuthor.name.charAt(0)}
          </div>
        )}
        <div>
          <p className="font-semibold text-[var(--m-ink-primary)]">{displayAuthor.name}</p>
          {displayAuthor.bio && (
            <p className="text-[14px] text-[var(--m-ink-secondary)] leading-[1.6] mt-1">
              {displayAuthor.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
