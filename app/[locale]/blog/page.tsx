import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { generatePageMetadata } from '@/lib/metadata';
import { sanityPublicClient } from '@/lib/sanity/client';
import { allPostsQuery, postsByCategoryQuery, featuredPostQuery } from '@/lib/sanity/queries';
import type { BlogPostSummary } from '@/lib/sanity/types';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { Section } from '@/components/marketing/primitives/section';
import { Container } from '@/components/marketing/primitives/container';
import { Overline } from '@/components/marketing/primitives/overline';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';
import { FeaturedPost } from '@/components/blog/featured-post';
import { CategoryFilter } from '@/components/blog/category-filter';
import { PostCard } from '@/components/blog/post-card';
import { cn } from '@/lib/utils';

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
  const isEn = locale === 'en';

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

  const filteredPosts = featuredPost
    ? posts.filter((p) => p._id !== featuredPost!._id)
    : posts;

  const hasCategory = category && category !== 'all';

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <Section variant="canvas" spacing="hero">
          <Container>
            <div className="mx-auto max-w-[720px] text-center">
              <Overline tone="coral" className="mb-3.5">
                {t('overline')}
              </Overline>
              <SectionHeading className="mb-5">
                {t.rich('heading', {
                  em: (chunks) => (
                    <span
                      className={cn(
                        'text-[var(--m-seafoam)]',
                        isEn && 'italic',
                      )}
                      style={isEn ? { fontFamily: 'var(--font-dm-serif)' } : undefined}
                    >
                      {chunks}
                    </span>
                  ),
                })}
              </SectionHeading>
              <p className="text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t('sub')}
              </p>
              <div className="mt-10">
                <Suspense>
                  <CategoryFilter />
                </Suspense>
              </div>
            </div>
          </Container>
        </Section>

        {featuredPost && !hasCategory && (
          <Section variant="canvas" spacing="flush" className="pb-16 md:pb-20">
            <Container>
              <FeaturedPost post={featuredPost} />
            </Container>
          </Section>
        )}

        <Section variant="canvas" spacing="flush" className="pb-20 md:pb-28">
          <Container>
            {filteredPosts.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-[15px] text-[var(--m-ink-tertiary)]">
                  {hasCategory ? t('no_posts_category') : t('no_posts')}
                </p>
              </div>
            )}
          </Container>
        </Section>
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
