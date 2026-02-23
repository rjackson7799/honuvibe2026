const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'HonuVibe.AI',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Hawaii-born AI education platform bridging the US and Japan ecosystems.',
    foundingDate: '2025',
    founder: {
      '@type': 'Person',
      name: 'Ryan Jackson',
      jobTitle: 'Founder & AI Educator',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Honolulu',
      addressRegion: 'HI',
      addressCountry: 'US',
    },
    sameAs: [
      'https://tiktok.com/@honuvibe',
      'https://instagram.com/honuvibe',
      'https://youtube.com/@honuvibe',
    ],
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HonuVibe.AI',
    url: baseUrl,
    inLanguage: ['en', 'ja'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateBlogPostSchema(post: {
  title: string;
  description: string;
  slug: string;
  author: string;
  publishedAt: string;
  category: string;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    url: `${baseUrl}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    articleSection: post.category,
    author: {
      '@type': 'Person',
      name: post.author,
      url: `${baseUrl}/about`,
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'HonuVibe.AI',
      url: baseUrl,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` },
    },
    ...(post.imageUrl && {
      image: { '@type': 'ImageObject', url: post.imageUrl },
    }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${post.slug}`,
    },
  };
}

export function generateCourseSchema(course: {
  title: string;
  description: string;
  level: string;
  language: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'HonuVibe.AI',
      url: baseUrl,
    },
    educationalLevel: course.level,
    inLanguage: course.language === 'EN/JP' ? ['en', 'ja'] : course.language.toLowerCase(),
  };
}
