'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Library, Video, FileText, Wrench, LayoutTemplate, BookOpen, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Overline } from '@/components/ui/overline';
import type { ContentItemForStudent } from '@/lib/dashboard/types';

type ContentFilter = 'all' | 'video' | 'article' | 'tool' | 'template' | 'guide';

const typeIcons: Record<string, typeof Video> = {
  video_custom: Video,
  video_youtube: Video,
  article: FileText,
  tool: Wrench,
  template: LayoutTemplate,
  guide: BookOpen,
  course_recording: Video,
};

function ContentCard({ item, locale }: { item: ContentItemForStudent; locale: string }) {
  const t = useTranslations('dashboard');
  const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
  const description = locale === 'ja' && item.description_jp ? item.description_jp : item.description_en;
  const Icon = typeIcons[item.content_type] ?? FileText;

  const typeLabel = item.content_type.includes('video')
    ? t('resources_filter_video')
    : item.content_type === 'article'
      ? t('resources_filter_article')
      : item.content_type === 'tool'
        ? t('resources_filter_tool')
        : item.content_type === 'template'
          ? t('resources_filter_template')
          : t('resources_filter_guide');

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-bg-secondary border border-border-default rounded-lg p-4 hover:border-border-hover transition-colors group"
    >
      {item.thumbnail_url && (
        <div className="aspect-video rounded-md overflow-hidden mb-3 bg-bg-tertiary">
          <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-bg-tertiary text-fg-tertiary">
          <Icon size={12} />
          {typeLabel}
        </span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          item.access_tier === 'free'
            ? 'bg-accent-teal/10 text-accent-teal'
            : 'bg-accent-gold/10 text-accent-gold',
        )}>
          {item.access_tier === 'free' ? t('resources_free') : t('resources_premium')}
        </span>
        {item.duration_minutes && (
          <span className="text-xs text-fg-tertiary">{item.duration_minutes} min</span>
        )}
      </div>
      <h3 className="text-sm font-medium text-fg-primary mb-1 group-hover:text-accent-teal transition-colors">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-fg-tertiary line-clamp-2">{description}</p>
      )}
    </a>
  );
}

export default function ResourcesPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [items, setItems] = useState<ContentItemForStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/resources');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filters: { key: ContentFilter; label: string }[] = [
    { key: 'all', label: t('resources_filter_all') },
    { key: 'video', label: t('resources_filter_video') },
    { key: 'article', label: t('resources_filter_article') },
    { key: 'tool', label: t('resources_filter_tool') },
    { key: 'template', label: t('resources_filter_template') },
    { key: 'guide', label: t('resources_filter_guide') },
  ];

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'video') return item.content_type.includes('video');
    return item.content_type === activeFilter;
  });

  if (loading) {
    return (
      <div className="space-y-8 max-w-[1100px]">
        <div>
          <Overline>{t('resources_overline')}</Overline>
          <h1 className="text-2xl font-serif text-fg-primary mt-2">{t('resources_heading')}</h1>
        </div>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-bg-tertiary rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1100px]">
      <div>
        <Overline>{t('resources_overline')}</Overline>
        <h1 className="text-2xl font-serif text-fg-primary mt-2">{t('resources_heading')}</h1>
        <p className="text-sm text-fg-secondary mt-2">{t('resources_sub')}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Library size={48} className="mx-auto text-fg-tertiary mb-4" />
          <p className="text-fg-tertiary text-sm">{t('resources_coming_soon')}</p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeFilter === filter.key
                    ? 'bg-accent-teal/10 text-accent-teal'
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <ContentCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
