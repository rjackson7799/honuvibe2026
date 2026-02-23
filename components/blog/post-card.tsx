import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Tag } from '@/components/ui/tag';
import { urlForImage } from '@/lib/sanity/image';
import type { BlogPostSummary } from '@/lib/sanity/types';
import { cn } from '@/lib/utils';

type PostCardProps = {
  post: BlogPostSummary;
  className?: string;
};

export function PostCard({ post, className }: PostCardProps) {
  const locale = useLocale();
  const t = useTranslations('blog');

  const title = locale === 'ja' && post.title_jp ? post.title_jp : post.title_en;
  const excerpt = locale === 'ja' && post.excerpt_jp ? post.excerpt_jp : post.excerpt_en;
  const readingTime = locale === 'ja' ? post.reading_time_jp : post.reading_time_en;

  const imageUrl = post.featured_image?.asset
    ? urlForImage(post.featured_image).width(600).height(340).format('webp').url()
    : null;

  const date = new Date(post.published_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/blog/${post.slug.current}`}
      className={cn(
        'group block rounded-lg bg-bg-secondary border border-border-default overflow-hidden',
        'transition-all duration-[var(--duration-normal)]',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover',
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-[16/9] bg-bg-tertiary overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={600}
            height={340}
            className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-tertiary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag>{t(`categories.${post.category}`)}</Tag>
          {readingTime && (
            <span className="text-xs text-fg-tertiary">
              {readingTime} {t('min_read')}
            </span>
          )}
        </div>

        <h3 className="font-serif text-lg font-normal text-fg-primary mb-2 line-clamp-2 group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
          {title}
        </h3>

        {excerpt && (
          <p className="text-sm text-fg-secondary leading-relaxed line-clamp-2 mb-3">
            {excerpt}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-fg-tertiary">
          <span>{date}</span>
          {post.author?.name && <span>{post.author.name}</span>}
        </div>
      </div>
    </Link>
  );
}
