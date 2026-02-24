import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GlossarySearch } from '@/components/glossary/GlossarySearch';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

const mockTerms = [
  {
    term_en: 'Large Language Model',
    abbreviation: 'LLM',
    slug: { current: 'llm' },
    definition_short_en: 'An AI model trained on text.',
    definition_short_jp: 'テキストで訓練されたAIモデル',
    category: 'core-concepts' as const,
    difficulty: 'beginner' as const,
  },
  {
    term_en: 'Retrieval-Augmented Generation',
    abbreviation: 'RAG',
    slug: { current: 'rag' },
    definition_short_en: 'Combines retrieval with generation.',
    category: 'models-architecture' as const,
    difficulty: 'intermediate' as const,
  },
];

const categories = [
  { value: 'all' as const, label: 'All' },
  { value: 'core-concepts' as const, label: 'Core Concepts' },
  { value: 'models-architecture' as const, label: 'Models & Architecture' },
];

describe('GlossarySearch', () => {
  it('renders the search input with placeholder', () => {
    render(
      <GlossarySearch
        terms={mockTerms}
        locale="en"
        onFilteredTermsChange={() => {}}
        categories={categories}
        searchPlaceholder="Search terms..."
        emptyState="No results."
      />
    );
    expect(screen.getByPlaceholderText('Search terms...')).toBeInTheDocument();
  });

  it('renders all category filter pills', () => {
    render(
      <GlossarySearch
        terms={mockTerms}
        locale="en"
        onFilteredTermsChange={() => {}}
        categories={categories}
        searchPlaceholder="Search..."
        emptyState="No results."
      />
    );
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Core Concepts')).toBeInTheDocument();
    expect(screen.getByText('Models & Architecture')).toBeInTheDocument();
  });

  it('calls onFilteredTermsChange with filtered results after debounce', async () => {
    const onChange = vi.fn();
    render(
      <GlossarySearch
        terms={mockTerms}
        locale="en"
        onFilteredTermsChange={onChange}
        categories={categories}
        searchPlaceholder="Search..."
        emptyState="No results."
      />
    );
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'LLM' } });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ abbreviation: 'LLM' })])
      );
    }, { timeout: 500 });
  });

  it('applies active styling to the selected category', () => {
    render(
      <GlossarySearch
        terms={mockTerms}
        locale="en"
        onFilteredTermsChange={() => {}}
        categories={categories}
        searchPlaceholder="Search..."
        emptyState="No results."
      />
    );
    const allButton = screen.getByText('All');
    expect(allButton.className).toContain('text-accent-teal');
  });
});
