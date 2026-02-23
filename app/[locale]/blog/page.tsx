import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { generatePageMetadata } from '@/lib/metadata';
import { sanityPublicClient } from '@/lib/sanity/client';
import { allPostsQuery, postsByCategoryQuery, featuredPostQuery } from '@/lib/sanity/queries';
import type { BlogPostSummary, BlogCategory } from '@/lib/sanity/types';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { FeaturedPost } from '@/components/blog/featured-post';
import { CategoryFilter } from '@/components/blog/category-filter';
import { PostCard } from '@/components/blog/post-card';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return generatePageMetadata({
    title: t('meta.title'),
    description: t('meta.description'),
    path: '/blog',
    locale,
  });
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'blog' });

  let posts: BlogPostSummary[] = [];
  let featuredPost: BlogPostSummary | null = null;

  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    if (category && category !== 'all') {
      posts = await sanityPublicClient.fetch(postsByCategoryQuery, { category });
    } else {
      [posts, featuredPost] = await Promise.all([
        sanityPublicClient.fetch(allPostsQuery),
        sanityPublicClient.fetch(featuredPostQuery),
      ]);
    }
  }

  // Remove featured post from the main list to avoid duplication
  const filteredPosts = featuredPost
    ? posts.filter((p) => p._id !== featuredPost._id)
    : posts;

  const hasCategory = category && category !== 'all';

  return (
    <>
      {/* Header */}
      <Section>
        <Container>
          <SectionHeading
            overline={t('overline')}
            heading={t('heading')}
            sub={t('sub')}
          />
        </Container>
      </Section>

      {/* Featured Post */}
      {featuredPost && !hasCategory && (
        <Section className="!pt-0">
          <Container>
            <FeaturedPost post={featuredPost} />
          </Container>
        </Section>
      )}

      {/* Category Filter + Posts */}
      <Section className="!pt-0">
        <Container>
          <Suspense>
            <CategoryFilter />
          </Suspense>

          {filteredPosts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
              {filteredPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-fg-secondary">
                {hasCategory ? t('no_posts_category') : t('no_posts')}
              </p>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
