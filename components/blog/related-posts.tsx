import { useTranslations } from 'next-intl';
import { sanityPublicClient } from '@/lib/sanity/client';
import { relatedPostsQuery } from '@/lib/sanity/queries';
import type { BlogPostSummary } from '@/lib/sanity/types';
import { PostCard } from './post-card';

type RelatedPostsProps = {
  category: string;
  currentSlug: string;
};

export async function RelatedPosts({ category, currentSlug }: RelatedPostsProps) {
  let posts: BlogPostSummary[] = [];

  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    posts = await sanityPublicClient.fetch(relatedPostsQuery, {
      category,
      slug: currentSlug,
    });
  }

  if (posts.length === 0) return null;

  return <RelatedPostsContent posts={posts} />;
}

function RelatedPostsContent({ posts }: { posts: BlogPostSummary[] }) {
  const t = useTranslations('blog');

  return (
    <div className="border-t border-[var(--m-border-soft)] pt-10 mt-12">
      <h3 className="font-bold text-[var(--m-text-h3)] tracking-[-0.015em] leading-[1.2] text-[var(--m-ink-primary)] mb-6">
        {t('related_posts')}
      </h3>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </div>
  );
}
