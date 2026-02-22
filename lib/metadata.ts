import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  locale?: string;
  ogImage?: string;
};

export function generatePageMetadata({
  title,
  description,
  path = '',
  locale = 'en',
  ogImage,
}: PageMetadataOptions): Metadata {
  const url = `${baseUrl}${locale === 'ja' ? '/ja' : ''}${path}`;
  const image = ogImage || `${baseUrl}/api/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `${baseUrl}${path}`,
        ja: `${baseUrl}/ja${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'HonuVibe.AI',
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
