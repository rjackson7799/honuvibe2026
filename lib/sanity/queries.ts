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
