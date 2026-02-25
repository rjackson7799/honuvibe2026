import { defineType, defineField, defineArrayMember } from 'sanity';

export const influencer = defineType({
  name: 'influencer',
  title: 'Influencer',
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
      name: 'avatar',
      title: 'Avatar',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'platforms',
      title: 'Platforms',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'platformEntry',
          fields: [
            defineField({
              name: 'platform',
              type: 'string',
              title: 'Platform',
            }),
            defineField({ name: 'url', type: 'url', title: 'URL' }),
          ],
          preview: {
            select: { title: 'platform', subtitle: 'url' },
          },
        }),
      ],
    }),
    defineField({
      name: 'specialty',
      title: 'Specialty',
      type: 'string',
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
  preview: {
    select: { title: 'name', subtitle: 'specialty', media: 'avatar' },
  },
});
