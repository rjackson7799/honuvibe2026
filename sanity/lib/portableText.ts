import { defineArrayMember } from 'sanity';

export const portableTextMembers = [
  defineArrayMember({
    type: 'block',
    styles: [
      { title: 'Normal', value: 'normal' },
      { title: 'H2', value: 'h2' },
      { title: 'H3', value: 'h3' },
      { title: 'Quote', value: 'blockquote' },
    ],
    marks: {
      decorators: [
        { title: 'Strong', value: 'strong' },
        { title: 'Emphasis', value: 'em' },
        { title: 'Code', value: 'code' },
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [{ name: 'href', type: 'url', title: 'URL' }],
        },
      ],
    },
  }),
  defineArrayMember({
    type: 'image',
    options: { hotspot: true },
    fields: [
      { name: 'alt', type: 'string', title: 'Alt text' },
      { name: 'caption', type: 'string', title: 'Caption' },
    ],
  }),
  defineArrayMember({
    name: 'code',
    type: 'object',
    title: 'Code Block',
    fields: [
      { name: 'language', type: 'string', title: 'Language' },
      { name: 'code', type: 'text', title: 'Code' },
    ],
  }),
];
