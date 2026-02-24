import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RelatedTerms } from '@/components/glossary/RelatedTerms';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

const mockTerms = [
  {
    term_en: 'Machine Learning',
    abbreviation: 'ML',
    slug: { current: 'ml' },
    definition_short_en: 'A subset of AI.',
    difficulty: 'beginner' as const,
  },
  {
    term_en: 'Neural Network',
    slug: { current: 'neural-network' },
    definition_short_en: 'Inspired by the brain.',
    difficulty: 'intermediate' as const,
  },
];

const difficultyLabels = {
  beginner: 'Beginner' as string,
  intermediate: 'Intermediate' as string,
  advanced: 'Advanced' as string,
};

describe('RelatedTerms', () => {
  it('renders all related term chips', () => {
    render(
      <RelatedTerms
        terms={mockTerms}
        locale="en"
        difficultyLabels={difficultyLabels}
        sourceTermSlug="llm"
      />
    );
    expect(screen.getByText('ML')).toBeInTheDocument();
    expect(screen.getByText('Neural Network')).toBeInTheDocument();
  });

  it('uses abbreviation as display name when present', () => {
    render(
      <RelatedTerms
        terms={mockTerms}
        locale="en"
        difficultyLabels={difficultyLabels}
        sourceTermSlug="llm"
      />
    );
    expect(screen.getByText('ML')).toBeInTheDocument();
  });

  it('renders null when terms array is empty', () => {
    const { container } = render(
      <RelatedTerms
        terms={[]}
        locale="en"
        difficultyLabels={difficultyLabels}
        sourceTermSlug="llm"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('links each chip to the correct glossary URL', () => {
    render(
      <RelatedTerms
        terms={mockTerms}
        locale="en"
        difficultyLabels={difficultyLabels}
        sourceTermSlug="llm"
      />
    );
    const mlLink = screen.getByText('ML').closest('a');
    expect(mlLink).toHaveAttribute('href', '/glossary/ml');
  });
});
