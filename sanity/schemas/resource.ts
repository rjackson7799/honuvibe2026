import { defineType, defineField } from 'sanity';

export const resource = defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description_en',
      title: 'Description (EN)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description_jp',
      title: 'Description (JP)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Build', value: 'build' },
          { title: 'Create', value: 'create' },
          { title: 'Learn', value: 'learn' },
          { title: 'Business', value: 'business' },
          { title: 'Communicate', value: 'communicate' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'pricing',
      title: 'Pricing',
      type: 'string',
      options: {
        list: [
          { title: 'Free', value: 'free' },
          { title: 'Freemium', value: 'freemium' },
          { title: 'Paid', value: 'paid' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
    }),
    defineField({
      name: 'relatedLibraryVideoSlug',
      title: 'Related Library Video Slug',
      type: 'string',
    }),
    defineField({
      name: 'relatedCourseSlug',
      title: 'Related Course Slug',
      type: 'string',
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 0,
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
      title: 'Sort Order',
      name: 'sortOrderAsc',
      by: [{ field: 'sortOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'category', media: 'logo' },
  },
});
