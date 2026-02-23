import { NextResponse } from 'next/server';
import { sanityPublicClient } from '@/lib/sanity/client';
import { allPostsQuery } from '@/lib/sanity/queries';
import type { BlogPostSummary } from '@/lib/sanity/types';

export const revalidate = 3600;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  let posts: BlogPostSummary[] = [];

  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    posts = await sanityPublicClient.fetch(allPostsQuery);
  }

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HonuVibe.AI Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Practical AI insights, tutorials, and stories from Hawaii.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml"/>
    ${posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title_en}]]></title>
      <link>${baseUrl}/blog/${post.slug.current}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug.current}</guid>
      <description><![CDATA[${post.excerpt_en || ''}]]></description>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <category>${post.category}</category>
    </item>`,
      )
      .join('')}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
