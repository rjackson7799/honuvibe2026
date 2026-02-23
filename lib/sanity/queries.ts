const postSummaryFields = `
  _id,
  title_en,
  title_jp,
  slug,
  excerpt_en,
  excerpt_jp,
  category,
  featured_image,
  published_at,
  reading_time_en,
  reading_time_jp,
  "author": author->{name, image, bio}
`;

export const allPostsQuery = `
  *[_type == "blogPost" && defined(published_at)] | order(published_at desc) {
    ${postSummaryFields}
  }
`;

export const postsByCategoryQuery = `
  *[_type == "blogPost" && category == $category && defined(published_at)] | order(published_at desc) {
    ${postSummaryFields}
  }
`;

export const featuredPostQuery = `
  *[_type == "blogPost" && defined(published_at)] | order(published_at desc)[0] {
    ${postSummaryFields}
  }
`;

export const postBySlugQuery = `
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id,
    title_en,
    title_jp,
    slug,
    body_en,
    body_jp,
    excerpt_en,
    excerpt_jp,
    category,
    featured_image,
    published_at,
    reading_time_en,
    reading_time_jp,
    "author": author->{name, image, bio}
  }
`;

export const relatedPostsQuery = `
  *[_type == "blogPost" && category == $category && slug.current != $slug && defined(published_at)] | order(published_at desc)[0..2] {
    ${postSummaryFields}
  }
`;

export const allPostSlugsQuery = `
  *[_type == "blogPost" && defined(published_at)] {
    "slug": slug.current
  }
`;

// Resources page queries
export const resourcesQuery = `
  *[_type == "resource" && isPublished == true] | order(category asc, sortOrder asc) {
    name,
    slug,
    description_en,
    description_jp,
    category,
    pricing,
    url,
    "logoUrl": logo.asset->url,
    relatedLibraryVideoSlug,
    relatedCourseSlug,
    isFeatured,
    sortOrder
  }
`;

export const influencersQuery = `
  *[_type == "influencer" && isPublished == true] | order(sortOrder asc) {
    name,
    slug,
    description_en,
    description_jp,
    "avatarUrl": avatar.asset->url,
    platforms,
    specialty,
    sortOrder
  }
`;

// ── Glossary queries ───────────────────────────────────────────────────────────

/** All published terms — lightweight, for index page */
export const glossaryIndexQuery = `
  *[_type == "glossaryTerm" && isPublished == true] | order(term_en asc) {
    term_en,
    term_jp,
    abbreviation,
    reading_jp,
    slug,
    definition_short_en,
    definition_short_jp,
    category,
    difficulty
  }
`;

/** Single term by slug — full content for detail page */
export const glossaryTermQuery = `
  *[_type == "glossaryTerm" && slug.current == $slug && isPublished == true][0] {
    term_en,
    term_jp,
    abbreviation,
    reading_jp,
    slug,
    definition_short_en,
    definition_short_jp,
    definition_full_en,
    definition_full_jp,
    why_it_matters_en,
    why_it_matters_jp,
    example_en,
    example_jp,
    category,
    difficulty,
    relatedTerms[]-> {
      term_en,
      term_jp,
      abbreviation,
      slug,
      definition_short_en,
      definition_short_jp,
      difficulty
    },
    relatedCourseSlug,
    relatedBlogSlug,
    relatedLibraryVideoSlug
  }
`;

/** All slugs — for generateStaticParams and sitemap */
export const glossarySlugQuery = `
  *[_type == "glossaryTerm" && isPublished == true] {
    "slug": slug.current
  }
`;
