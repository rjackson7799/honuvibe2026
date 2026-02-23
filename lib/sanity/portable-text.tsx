'use client';

import { PortableText, type PortableTextComponents, type PortableTextBlock } from '@portabletext/react';
import Image from 'next/image';
import { urlForImage } from './image';
import type { SanityImage } from './types';

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="font-serif text-h2 font-normal text-fg-primary mt-10 mb-4">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-serif text-h3 font-normal text-fg-primary mt-8 mb-3">{children}</h3>
    ),
    normal: ({ children }) => (
      <p className="text-base text-fg-secondary leading-relaxed mb-5">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-accent-teal pl-6 my-6 text-fg-secondary italic">
        {children}
      </blockquote>
    ),
  },
  marks: {
    link: ({ children, value }) => (
      <a
        href={value?.href}
        className="text-accent-teal underline hover:text-accent-teal-hover transition-colors duration-[var(--duration-fast)]"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({ children }) => (
      <code className="font-mono text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">{children}</code>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-fg-primary">{children}</strong>
    ),
    em: ({ children }) => <em>{children}</em>,
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 mb-5 space-y-2 text-fg-secondary">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 mb-5 space-y-2 text-fg-secondary">{children}</ol>
    ),
  },
  types: {
    image: ({ value }: { value: SanityImage & { alt?: string; caption?: string } }) => {
      const imageUrl = value?.asset ? urlForImage(value).width(880).format('webp').url() : null;
      if (!imageUrl) return null;

      return (
        <figure className="my-8">
          <div className="rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt={value.alt || ''}
              width={880}
              height={495}
              className="w-full h-auto"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-sm text-fg-tertiary text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    code: ({ value }: { value: { code: string; language?: string } }) => (
      <pre className="bg-bg-tertiary rounded-lg p-4 mb-5 overflow-x-auto">
        <code className="font-mono text-sm text-fg-primary">{value.code}</code>
      </pre>
    ),
  },
};

type BlogPortableTextProps = {
  value: PortableTextBlock[];
};

export function BlogPortableText({ value }: BlogPortableTextProps) {
  return <PortableText value={value} components={components} />;
}
