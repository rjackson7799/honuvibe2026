import { defineType, defineField } from 'sanity';
import { portableTextMembers } from '../lib/portableText';

export const newsletterIssue = defineType({
  name: 'newsletterIssue',
  title: 'Newsletter Issue',
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
      name: 'issueNumber',
      title: 'Issue Number',
      type: 'number',
      validation: (rule) => rule.required().positive().integer(),
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
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'readingTime_en',
      title: 'Reading Time EN (min)',
      type: 'number',
    }),
    defineField({
      name: 'readingTime_jp',
      title: 'Reading Time JP (min)',
      type: 'number',
    }),
    defineField({
      name: 'beehiivUrl',
      title: 'Beehiiv URL',
      type: 'url',
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'relatedBlogSlugs',
      title: 'Related Blog Slugs',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'relatedCourseSlugs',
      title: 'Related Course Slugs',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'isPublished',
      title: 'Published',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  orderings: [
    {
      title: 'Issue Number, Newest',
      name: 'issueNumberDesc',
      by: [{ field: 'issueNumber', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title_en',
      subtitle: 'issueNumber',
      media: 'featuredImage',
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `Issue #${subtitle}` : '',
        media,
      };
    },
  },
});
