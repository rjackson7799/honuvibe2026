import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HvFaqAccordion } from '@/components/marketing/hv/faq-accordion';

const ITEMS = [
  { q: 'Do I need a technical background?', a: 'No.' },
  { q: 'Can I cancel anytime?', a: 'Yes.' },
  { q: 'Are lessons in Japanese?', a: 'Yes, every one.' },
];

function panelFor(button: HTMLElement) {
  const id = button.getAttribute('aria-controls')!;
  return document.getElementById(id)!;
}

describe('HvFaqAccordion', () => {
  it('opens the first row by default with real aria wiring', () => {
    render(<HvFaqAccordion items={ITEMS} />);
    const q1 = screen.getByRole('button', { name: ITEMS[0].q });
    const q2 = screen.getByRole('button', { name: ITEMS[1].q });
    expect(q1).toHaveAttribute('aria-expanded', 'true');
    expect(q2).toHaveAttribute('aria-expanded', 'false');
    expect(panelFor(q1).hidden).toBe(false);
    expect(panelFor(q2).hidden).toBe(true);
  });

  it('is single-open: opening one row closes the other', () => {
    render(<HvFaqAccordion items={ITEMS} />);
    const q1 = screen.getByRole('button', { name: ITEMS[0].q });
    const q3 = screen.getByRole('button', { name: ITEMS[2].q });
    fireEvent.click(q3);
    expect(q3).toHaveAttribute('aria-expanded', 'true');
    expect(q1).toHaveAttribute('aria-expanded', 'false');
    expect(panelFor(q1).hidden).toBe(true);
    expect(panelFor(q3).textContent).toContain('Yes, every one.');
  });

  it('clicking the open row closes it', () => {
    render(<HvFaqAccordion items={ITEMS} />);
    const q1 = screen.getByRole('button', { name: ITEMS[0].q });
    fireEvent.click(q1);
    expect(q1).toHaveAttribute('aria-expanded', 'false');
    expect(panelFor(q1).hidden).toBe(true);
  });

  it('rotates the + glyph into × on the open row', () => {
    render(<HvFaqAccordion items={ITEMS} defaultOpen={1} />);
    const q2 = screen.getByRole('button', { name: ITEMS[1].q });
    const glyph = q2.querySelector('[aria-hidden]') as HTMLElement;
    expect(glyph.className).toContain('rotate-45');
  });

  it('can start fully closed', () => {
    render(<HvFaqAccordion items={ITEMS} defaultOpen={-1} />);
    screen.getAllByRole('button').forEach((b) => expect(b).toHaveAttribute('aria-expanded', 'false'));
  });
});
