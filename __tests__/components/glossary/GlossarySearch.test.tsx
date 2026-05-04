import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GlossarySearch } from '@/components/glossary/GlossarySearch';

describe('GlossarySearch', () => {
  it('renders the search input with the given placeholder', () => {
    render(
      <GlossarySearch value="" onChange={() => {}} placeholder="Search terms..." />,
    );
    expect(screen.getByPlaceholderText('Search terms...')).toBeInTheDocument();
  });

  it('reflects the controlled value', () => {
    render(
      <GlossarySearch value="LLM" onChange={() => {}} placeholder="Search..." />,
    );
    expect(screen.getByDisplayValue('LLM')).toBeInTheDocument();
  });

  it('calls onChange with the new value when the input changes', () => {
    const handleChange = vi.fn();
    render(
      <GlossarySearch value="" onChange={handleChange} placeholder="Search..." />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search...'), {
      target: { value: 'rag' },
    });
    expect(handleChange).toHaveBeenCalledWith('rag');
  });
});
