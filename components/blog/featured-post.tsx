import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Overline } from '@/components/marketing/primitives/overline';
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
      className="group block overflow-hidden rounded-[var(--m-radius-2xl)] bg-[var(--m-white)] border border-[var(--m-border-soft)] shadow-[var(--m-shadow-sm)] transition-all duration-200 hover:shadow-[var(--m-shadow-lg)] hover:border-[var(--m-border-default)]"
    >
      <div className="grid md:grid-cols-2 gap-0">
        <div className="aspect-[16/9] md:aspect-auto bg-[var(--m-sand)] overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={880}
              height={495}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full min-h-[240px] flex items-center justify-center text-[var(--m-ink-tertiary)]">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
                <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
              </svg>
            </div>
          )}
        </div>

        <div className="p-7 md:p-10 flex flex-col justify-center">
          <Overline tone="coral" className="mb-3">{t('featured')}</Overline>

          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center rounded-full border border-[var(--m-border-teal)] bg-[var(--m-accent-teal-soft)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--m-accent-teal-dark)]">
              {t(`categories.${post.category}`)}
            </span>
            {readingTime && (
              <span className="text-[12px] text-[var(--m-ink-tertiary)]">
                {readingTime} {t('min_read')}
              </span>
            )}
          </div>

          <h2 className="font-bold text-[clamp(22px,3vw,32px)] leading-[1.2] text-[var(--m-ink-primary)] mb-3 group-hover:text-[var(--m-accent-teal-dark)] transition-colors duration-150">
            {title}
          </h2>

          {excerpt && (
            <p className="text-[16px] text-[var(--m-ink-secondary)] leading-[1.6] mb-5 line-clamp-3">
              {excerpt}
            </p>
          )}

          <div className="flex items-center gap-3 text-[13px] text-[var(--m-ink-tertiary)]">
            <span>{date}</span>
            {post.author?.name && (
              <>
                <span aria-hidden>·</span>
                <span>{post.author.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
