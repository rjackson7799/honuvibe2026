import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GlossaryTermCard } from '@/components/glossary/GlossaryTermCard';

// Mock next-intl Link
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const defaultProps = {
  term_en: 'Large Language Model',
  abbreviation: 'LLM',
  slug: { current: 'llm' },
  definition_short: 'A type of AI model trained on massive amounts of text.',
  difficulty: 'beginner' as const,
  difficultyLabel: 'Beginner',
  locale: 'en',
};

describe('GlossaryTermCard', () => {
  it('renders the abbreviation as primary display when present', () => {
    render(<GlossaryTermCard {...defaultProps} />);
    expect(screen.getByText('LLM')).toBeInTheDocument();
  });

  it('renders the full EN term alongside abbreviation', () => {
    render(<GlossaryTermCard {...defaultProps} />);
    expect(screen.getByText('Large Language Model')).toBeInTheDocument();
  });

  it('uses EN term as primary display when no abbreviation', () => {
    render(<GlossaryTermCard {...defaultProps} abbreviation={undefined} />);
    expect(screen.getByText('Large Language Model')).toBeInTheDocument();
  });

  it('renders the short definition', () => {
    render(<GlossaryTermCard {...defaultProps} />);
    expect(screen.getByText('A type of AI model trained on massive amounts of text.')).toBeInTheDocument();
  });

  it('renders JP term when provided', () => {
    render(<GlossaryTermCard {...defaultProps} term_jp="大規模言語モデル" />);
    expect(screen.getByText('大規模言語モデル')).toBeInTheDocument();
  });

  it('does not render JP term when not provided', () => {
    const { container } = render(<GlossaryTermCard {...defaultProps} />);
    // Should not have any JP-specific content
    expect(container.textContent).not.toContain('大規模言語モデル');
  });

  it('links to the correct glossary slug', () => {
    render(<GlossaryTermCard {...defaultProps} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/glossary/llm');
  });

  it('renders the difficulty badge', () => {
    render(<GlossaryTermCard {...defaultProps} />);
    expect(screen.getAllByText('Beginner').length).toBeGreaterThan(0);
  });
});
