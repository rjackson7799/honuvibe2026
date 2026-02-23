import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { generatePageMetadata } from '@/lib/metadata';
import { generateBlogPostSchema } from '@/lib/json-ld';
import { sanityPublicClient } from '@/lib/sanity/client';
import { postBySlugQuery, allPostSlugsQuery } from '@/lib/sanity/queries';
import type { BlogPost } from '@/lib/sanity/types';
import { BlogPortableText } from '@/lib/sanity/portable-text';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Tag } from '@/components/ui/tag';
import { Link } from '@/i18n/navigation';
import { ShareButtons } from '@/components/blog/share-buttons';
import { AuthorBio } from '@/components/blog/author-bio';
import { NewsletterCta } from '@/components/blog/newsletter-cta';
import { RelatedPosts } from '@/components/blog/related-posts';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return [];
  const slugs = await sanityPublicClient.fetch(allPostSlugsQuery);
  return slugs.map((s: { slug: string }) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return generatePageMetadata({ title: 'Blog Post', description: '', path: `/blog/${slug}`, locale });
  }

  const post: BlogPost | null = await sanityPublicClient.fetch(postBySlugQuery, { slug });
  if (!post) return {};

  const title = locale === 'ja' && post.title_jp ? post.title_jp : post.title_en;
  const description = locale === 'ja' && post.excerpt_jp ? post.excerpt_jp : post.excerpt_en;
  const readingTime = locale === 'ja' ? post.reading_time_jp : post.reading_time_en;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent(title)}&category=${post.category}${readingTime ? `&reading_time=${readingTime}` : ''}`;

  return generatePageMetadata({
    title,
    description,
    path: `/blog/${slug}`,
    locale,
    ogImage,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'blog' });

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    notFound();
  }

  const post: BlogPost | null = await sanityPublicClient.fetch(postBySlugQuery, { slug });
  if (!post) notFound();

  const title = locale === 'ja' && post.title_jp ? post.title_jp : post.title_en;
  const body = locale === 'ja' && post.body_jp ? post.body_jp : post.body_en;
  const readingTime = locale === 'ja' ? post.reading_time_jp : post.reading_time_en;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  const postUrl = `${baseUrl}${locale === 'ja' ? '/ja' : ''}/blog/${slug}`;

  const date = new Date(post.published_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const articleSchema = generateBlogPostSchema({
    title,
    description: (locale === 'ja' && post.excerpt_jp ? post.excerpt_jp : post.excerpt_en) || '',
    slug,
    author: post.author?.name || 'Ryan Jackson',
    publishedAt: post.published_at,
    category: post.category,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article>
        {/* Header */}
        <Section>
          <Container>
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-fg-tertiary hover:text-fg-secondary transition-colors duration-[var(--duration-fast)] mb-8"
            >
              <ArrowLeft size={16} />
              {t('back_to_blog')}
            </Link>

            {/* Article meta */}
            <div className="flex items-center gap-3 mb-4">
              <Tag>{t(`categories.${post.category}`)}</Tag>
              <span className="text-sm text-fg-tertiary">{date}</span>
              {readingTime && (
                <span className="text-sm text-fg-tertiary">
                  {readingTime} {t('min_read')}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-h1 font-normal text-fg-primary mb-6">{title}</h1>

            {/* Author + Share */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-default pb-6">
              <div className="flex items-center gap-3">
                {post.author?.name && (
                  <span className="text-sm text-fg-secondary">{post.author.name}</span>
                )}
              </div>
              <ShareButtons url={postUrl} title={title} locale={locale} slug={slug} />
            </div>
          </Container>
        </Section>

        {/* Body */}
        <Section className="!pt-0">
          <Container>
            {body && body.length > 0 ? (
              <div className="max-w-content">
                <BlogPortableText value={body} />

                {/* Mid-article newsletter CTA */}
                <NewsletterCta />

                {/* End of article */}
              </div>
            ) : (
              <p className="text-fg-secondary">{t('no_posts')}</p>
            )}

            {/* Author bio */}
            <AuthorBio author={post.author} />

            {/* End newsletter CTA */}
            <NewsletterCta />

            {/* Related posts */}
            <RelatedPosts category={post.category} currentSlug={slug} />
          </Container>
        </Section>
      </article>
    </>
  );
}
