import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GlossaryAlphaNav } from '@/components/glossary/GlossaryAlphaNav';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

describe('GlossaryAlphaNav', () => {
  it('renders all 26 letters', () => {
    render(<GlossaryAlphaNav activeLetters={new Set(['A', 'L', 'R'])} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Z')).toBeInTheDocument();
    // Total 26 letters
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(26);
  });

  it('disables letters with no active terms', () => {
    render(<GlossaryAlphaNav activeLetters={new Set(['L'])} />);
    const aButton = screen.getByText('A').closest('button');
    expect(aButton).toBeDisabled();
  });

  it('enables letters with active terms', () => {
    render(<GlossaryAlphaNav activeLetters={new Set(['L'])} />);
    const lButton = screen.getByText('L').closest('button');
    expect(lButton).not.toBeDisabled();
  });

  it('applies muted styling to inactive letters', () => {
    render(<GlossaryAlphaNav activeLetters={new Set(['L'])} />);
    const bButton = screen.getByText('B');
    expect(bButton.className).toContain('text-fg-muted');
  });
});
