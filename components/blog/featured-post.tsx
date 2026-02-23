import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Tag } from '@/components/ui/tag';
import { Overline } from '@/components/ui/overline';
import { urlForImage } from '@/lib/sanity/image';
import type { BlogPostSummary } from '@/lib/sanity/types';

type FeaturedPostProps = {
  post: BlogPostSummary;
};

export function FeaturedPost({ post }: FeaturedPostProps) {
  const locale = useLocale();
  const t = useTranslations('blog');

  const title = locale === 'ja' && post.title_jp ? post.title_jp : post.title_en;
  const excerpt = locale === 'ja' && post.excerpt_jp ? post.excerpt_jp : post.excerpt_en;
  const readingTime = locale === 'ja' ? post.reading_time_jp : post.reading_time_en;

  const imageUrl = post.featured_image?.asset
    ? urlForImage(post.featured_image).width(880).height(495).format('webp').url()
    : null;

  const date = new Date(post.published_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link
      href={`/blog/${post.slug.current}`}
      className="group block rounded-xl bg-bg-secondary border border-border-default overflow-hidden transition-all duration-[var(--duration-normal)] hover:shadow-lg hover:border-border-hover"
    >
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image */}
        <div className="aspect-[16/9] md:aspect-auto bg-bg-tertiary overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={880}
              height={495}
              className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full min-h-[240px] flex items-center justify-center text-fg-tertiary">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
                <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <Overline className="mb-3">{t('featured')}</Overline>

          <div className="flex items-center gap-2 mb-4">
            <Tag>{t(`categories.${post.category}`)}</Tag>
            {readingTime && (
              <span className="text-xs text-fg-tertiary">
                {readingTime} {t('min_read')}
              </span>
            )}
          </div>

          <h2 className="font-serif text-h3 md:text-h2 font-normal text-fg-primary mb-3 group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
            {title}
          </h2>

          {excerpt && (
            <p className="text-base text-fg-secondary leading-relaxed mb-4 line-clamp-3">
              {excerpt}
            </p>
          )}

          <div className="flex items-center gap-3 text-sm text-fg-tertiary">
            <span>{date}</span>
            {post.author?.name && (
              <>
                <span className="text-fg-muted">|</span>
                <span>{post.author.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
