'use client';

import { LibraryVideoCard } from './LibraryVideoCard';
import { Overline } from '@/components/ui/overline';
import type { LibraryVideoCardProps } from '@/lib/library/types';

type MyLibrarySectionProps = {
  continueWatching: LibraryVideoCardProps[];
  favorites: LibraryVideoCardProps[];
  recentlyWatched: LibraryVideoCardProps[];
  locale: string;
  translations: {
    continueWatching: string;
    favorites: string;
    recentlyWatched: string;
    emptyState: string;
    exploreCta: string;
  };
};

function VideoRow({ videos, label }: { videos: LibraryVideoCardProps[]; label: string }) {
  if (videos.length === 0) return null;

  return (
    <div>
      <Overline className="mb-4">{label}</Overline>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:overflow-visible">
        {videos.map((video) => (
          <div key={video.id} className="shrink-0 w-[280px] md:w-auto" style={{ scrollSnapAlign: 'start' }}>
            <LibraryVideoCard {...video} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyLibrarySection({
  continueWatching,
  favorites,
  recentlyWatched,
  locale,
  translations,
}: MyLibrarySectionProps) {
  const isEmpty =
    continueWatching.length === 0 &&
    favorites.length === 0 &&
    recentlyWatched.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-16">
        <p className="text-fg-tertiary">{translations.emptyState}</p>
        <a
          href={`${locale === 'ja' ? '/ja' : ''}/learn/library`}
          className="inline-block mt-4 text-accent-teal hover:underline text-sm"
        >
          {translations.exploreCta}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <VideoRow videos={continueWatching} label={translations.continueWatching} />
      <VideoRow videos={favorites} label={translations.favorites} />
      <VideoRow videos={recentlyWatched} label={translations.recentlyWatched} />
    </div>
  );
}
