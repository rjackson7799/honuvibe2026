import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
        'group block overflow-hidden rounded-[var(--m-radius-xl)]',
        'bg-[var(--m-white)] border border-[var(--m-border-soft)]',
        'shadow-[var(--m-shadow-xs)]',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-[var(--m-border-default)] hover:shadow-[var(--m-shadow-md)]',
        className,
      )}
    >
      <div className="aspect-[16/9] bg-[var(--m-sand)] overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={600}
            height={340}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--m-ink-tertiary)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center rounded-full border border-[var(--m-border-teal)] bg-[var(--m-accent-teal-soft)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--m-accent-teal-dark)]">
            {t(`categories.${post.category}`)}
          </span>
          {readingTime && (
            <span className="text-[12px] text-[var(--m-ink-tertiary)]">
              {readingTime} {t('min_read')}
            </span>
          )}
        </div>

        <h3 className="font-bold text-[18px] leading-[1.3] text-[var(--m-ink-primary)] mb-2 line-clamp-2 group-hover:text-[var(--m-accent-teal-dark)] transition-colors duration-150">
          {title}
        </h3>

        {excerpt && (
          <p className="text-[14px] text-[var(--m-ink-secondary)] leading-[1.55] line-clamp-2 mb-3">
            {excerpt}
          </p>
        )}

        <div className="flex items-center justify-between text-[12px] text-[var(--m-ink-tertiary)]">
          <span>{date}</span>
          {post.author?.name && <span>{post.author.name}</span>}
        </div>
      </div>
    </Link>
  );
}
