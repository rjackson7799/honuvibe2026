'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LibraryFilter } from './LibraryFilter';
import { LibraryVideoCard } from './LibraryVideoCard';
import { Overline } from '@/components/ui/overline';
import type { LibraryVideoCardProps, LibraryVideoCategory } from '@/lib/library/types';

type LibraryContentProps = {
  videos: LibraryVideoCardProps[];
  locale: string;
};

const CATEGORY_KEYS: ('all' | LibraryVideoCategory)[] = [
  'all',
  'ai-basics',
  'coding-tools',
  'business-automation',
  'image-video',
  'productivity',
  'getting-started',
];

export function LibraryContent({ videos, locale }: LibraryContentProps) {
  const t = useTranslations('library');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = CATEGORY_KEYS.map((key) => ({
    value: key,
    label: t(key === 'all' ? 'filter_all' : `filter_${key.replace(/-/g, '_')}`),
  }));

  const featuredVideos = useMemo(
    () => videos.filter((v) => v.isFeatured),
    [videos],
  );

  const filteredVideos = useMemo(() => {
    let result = videos;

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter((v) => v.category === activeCategory);
    } else {
      // In "All" view, exclude featured from main grid (shown in featured row)
      result = result.filter((v) => !v.isFeatured);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query),
      );
    }

    return result;
  }, [videos, activeCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-10">
      {/* Featured row — only in "All" view when not searching */}
      {activeCategory === 'all' && !searchQuery.trim() && featuredVideos.length > 0 && (
        <div>
          <Overline className="mb-4">{t('featured_label')}</Overline>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-3 xl:grid-cols-4 md:overflow-visible">
            {featuredVideos.map((video) => (
              <div key={video.id} className="shrink-0 w-[300px] md:w-auto" style={{ scrollSnapAlign: 'start' }}>
                <LibraryVideoCard {...video} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + Grid */}
      <div>
        <LibraryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          locale={locale}
        />

        {filteredVideos.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-4 mt-6">
            {filteredVideos.map((video) => (
              <LibraryVideoCard key={video.id} {...video} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-fg-tertiary">{t('empty_state')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
