import { LibraryVideoCard } from './LibraryVideoCard';
import type { LibraryVideoCardProps } from '@/lib/library/types';

type RelatedVideosProps = {
  videos: LibraryVideoCardProps[];
  heading: string;
};

export function RelatedVideos({ videos, heading }: RelatedVideosProps) {
  if (videos.length === 0) return null;

  return (
    <div>
      <h2 className="font-serif text-xl text-fg-primary mb-4">{heading}</h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {videos.map((video) => (
          <LibraryVideoCard key={video.id} {...video} />
        ))}
      </div>
    </div>
  );
}
