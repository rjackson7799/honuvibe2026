import { defineType, defineField } from 'sanity';
import { portableTextMembers } from '../lib/portableText';

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title_en',
      title: 'Title (EN)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title_jp',
      title: 'Title (JP)',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title_en', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body_en',
      title: 'Body (EN)',
      type: 'array',
      of: portableTextMembers,
    }),
    defineField({
      name: 'body_jp',
      title: 'Body (JP)',
      type: 'array',
      of: portableTextMembers,
    }),
    defineField({
      name: 'excerpt_en',
      title: 'Excerpt (EN)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt_jp',
      title: 'Excerpt (JP)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'AI Tools', value: 'ai-tools' },
          { title: 'Entrepreneurship', value: 'entrepreneurship' },
          { title: 'Japan-US', value: 'japan-us' },
          { title: 'Behind the Build', value: 'behind-the-build' },
          { title: 'HonuHub Stories', value: 'honuhub-stories' },
          { title: 'Impact', value: 'impact' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'featured_image',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
      ],
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
    }),
    defineField({
      name: 'published_at',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'reading_time_en',
      title: 'Reading Time EN (min)',
      type: 'number',
    }),
    defineField({
      name: 'reading_time_jp',
      title: 'Reading Time JP (min)',
      type: 'number',
    }),
  ],
  orderings: [
    {
      title: 'Published Date, New',
      name: 'publishedAtDesc',
      by: [{ field: 'published_at', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title_en',
      subtitle: 'category',
      media: 'featured_image',
    },
  },
});
