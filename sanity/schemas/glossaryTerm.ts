import { defineType, defineField } from 'sanity';
import { portableTextMembers } from '../lib/portableText';

export const glossaryTerm = defineType({
  name: 'glossaryTerm',
  title: 'Glossary Term',
  type: 'document',
  fields: [
    defineField({
      name: 'term_en',
      title: 'Term (EN)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'term_jp',
      title: 'Term (JP)',
      type: 'string',
    }),
    defineField({
      name: 'abbreviation',
      title: 'Abbreviation',
      type: 'string',
      description: 'e.g., LLM, RAG, GPT',
    }),
    defineField({
      name: 'reading_jp',
      title: 'Reading (JP)',
      type: 'string',
      description: 'Japanese pronunciation guide (furigana/katakana)',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'term_en', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'definition_short_en',
      title: 'Short Definition (EN)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'definition_short_jp',
      title: 'Short Definition (JP)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'definition_full_en',
      title: 'Full Definition (EN)',
      type: 'array',
      of: portableTextMembers,
    }),
    defineField({
      name: 'definition_full_jp',
      title: 'Full Definition (JP)',
      type: 'array',
      of: portableTextMembers,
    }),
    defineField({
      name: 'why_it_matters_en',
      title: 'Why It Matters (EN)',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'why_it_matters_jp',
      title: 'Why It Matters (JP)',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'example_en',
      title: 'Example (EN)',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'example_jp',
      title: 'Example (JP)',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Core Concepts', value: 'core-concepts' },
          { title: 'Models & Architecture', value: 'models-architecture' },
          { title: 'Tools & Platforms', value: 'tools-platforms' },
          { title: 'Business Strategy', value: 'business-strategy' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty',
      type: 'string',
      options: {
        list: [
          { title: 'Beginner', value: 'beginner' },
          { title: 'Intermediate', value: 'intermediate' },
          { title: 'Advanced', value: 'advanced' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'relatedTerms',
      title: 'Related Terms',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'glossaryTerm' }] }],
    }),
    defineField({
      name: 'relatedCourseSlug',
      title: 'Related Course Slug',
      type: 'string',
    }),
    defineField({
      name: 'relatedBlogSlug',
      title: 'Related Blog Slug',
      type: 'string',
    }),
    defineField({
      name: 'relatedLibraryVideoSlug',
      title: 'Related Library Video Slug',
      type: 'string',
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
      title: 'Term A-Z',
      name: 'termAsc',
      by: [{ field: 'term_en', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'term_en',
      subtitle: 'abbreviation',
    },
    prepare({ title, subtitle }) {
      return {
        title: subtitle ? `${title} (${subtitle})` : title,
      };
    },
  },
});
