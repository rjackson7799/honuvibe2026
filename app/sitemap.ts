import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';

const routes = [
  '',
  '/honuhub',
  '/exploration',
  '/about',
  '/community',
  '/apply',
  '/privacy',
  '/terms',
  '/cookies',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    entries.push({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? 'weekly' : 'monthly',
      priority: route === '' ? 1.0 : 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}${route}`,
          ja: `${baseUrl}/ja${route}`,
        },
      },
    });
  }

  return entries;
}
