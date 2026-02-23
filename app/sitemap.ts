import type { MetadataRoute } from 'next';
import { sanityPublicClient } from '@/lib/sanity/client';
import { allPostSlugsQuery } from '@/lib/sanity/queries';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';

const routes = [
  '',
  '/honuhub',
  '/exploration',
  '/about',
  '/community',
  '/apply',
  '/blog',
  '/privacy',
  '/terms',
  '/cookies',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    entries.push({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? 'weekly' : route === '/blog' ? 'daily' : 'monthly',
      priority: route === '' ? 1.0 : route === '/blog' ? 0.9 : 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}${route}`,
          ja: `${baseUrl}/ja${route}`,
        },
      },
    });
  }

  // Dynamic blog posts from Sanity
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    try {
      const slugs: { slug: string }[] = await sanityPublicClient.fetch(allPostSlugsQuery);
      for (const { slug } of slugs) {
        entries.push({
          url: `${baseUrl}/blog/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              en: `${baseUrl}/blog/${slug}`,
              ja: `${baseUrl}/ja/blog/${slug}`,
            },
          },
        });
      }
    } catch {
      // Sanity not configured or unreachable — skip blog entries
    }
  }

  return entries;
}
