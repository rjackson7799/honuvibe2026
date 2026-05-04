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
import { Link } from '@/i18n/navigation';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { Section } from '@/components/marketing/primitives/section';
import { Container } from '@/components/marketing/primitives/container';
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
    <MarketingShell>
      <MarketingNav />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />

        <article>
          <Section variant="canvas" spacing="hero">
            <Container>
              <div className="mx-auto max-w-[820px]">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--m-ink-tertiary)] hover:text-[var(--m-accent-teal)] transition-colors duration-150 mb-10"
                >
                  <ArrowLeft size={16} />
                  {t('back_to_blog')}
                </Link>

                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="inline-flex items-center rounded-full border border-[var(--m-border-teal)] bg-[var(--m-accent-teal-soft)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--m-accent-teal-dark)]">
                    {t(`categories.${post.category}`)}
                  </span>
                  <span className="text-[13px] text-[var(--m-ink-tertiary)]">{date}</span>
                  {readingTime && (
                    <span className="text-[13px] text-[var(--m-ink-tertiary)]">
                      {readingTime} {t('min_read')}
                    </span>
                  )}
                </div>

                <h1 className="font-bold text-[var(--m-text-h1)] leading-[1.1] tracking-[-0.022em] text-[var(--m-ink-primary)] mb-7">
                  {title}
                </h1>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--m-border-soft)] pb-6">
                  <div className="flex items-center gap-3">
                    {post.author?.name && (
                      <span className="text-[14px] font-medium text-[var(--m-ink-secondary)]">
                        {post.author.name}
                      </span>
                    )}
                  </div>
                  <ShareButtons url={postUrl} title={title} locale={locale} slug={slug} />
                </div>
              </div>
            </Container>
          </Section>

          <Section variant="canvas" spacing="flush" className="pb-20 md:pb-24">
            <Container>
              <div className="mx-auto max-w-[820px]">
                {body && body.length > 0 ? (
                  <div className="text-[var(--m-ink-secondary)]">
                    <BlogPortableText value={body} />
                    <NewsletterCta />
                  </div>
                ) : (
                  <p className="text-[var(--m-ink-secondary)]">{t('no_posts')}</p>
                )}

                <AuthorBio author={post.author} />

                <RelatedPosts category={post.category} currentSlug={slug} />
              </div>
            </Container>
          </Section>
        </article>
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
