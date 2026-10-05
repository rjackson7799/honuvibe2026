import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HvTestimonialCarousel } from '@/components/marketing/hv/testimonial-carousel';
import { stubMatchMedia } from './helpers';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string, vars?: Record<string, number>) =>
    key === 'quote_n' ? `Quote ${vars?.n}` : key,
}));

const QUOTES = [
  { text: 'First quote', name: 'A', org: 'Org A' },
  { text: 'Second quote', name: 'B', org: 'Org B' },
  { text: 'Third quote', name: 'C', org: 'Org C' },
];

const carousel = () => document.querySelector('figure') as HTMLElement;

describe('HvTestimonialCarousel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('auto-advances on the interval and wraps around', () => {
    stubMatchMedia(false);
    render(<HvTestimonialCarousel quotes={QUOTES} interval={1000} />);
    expect(screen.getByText('First quote')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('Second quote')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText('First quote')).toBeInTheDocument();
  });

  it('a dot click jumps to that quote and stops auto-rotation (WCAG 2.2.2)', () => {
    stubMatchMedia(false);
    render(<HvTestimonialCarousel quotes={QUOTES} interval={1000} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quote 3' }));
    expect(screen.getByText('Third quote')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quote 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Quote 1' })).toHaveAttribute('aria-pressed', 'false');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('Third quote')).toBeInTheDocument();
    expect(carousel()).toHaveAttribute('data-rotating', 'false');
  });

  it('pauses while hovered or focused and resumes after', () => {
    stubMatchMedia(false);
    render(<HvTestimonialCarousel quotes={QUOTES} interval={1000} />);
    const fig = carousel();
    fireEvent.mouseEnter(fig);
    expect(fig).toHaveAttribute('data-rotating', 'false');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('First quote')).toBeInTheDocument();
    fireEvent.mouseLeave(fig);
    expect(fig).toHaveAttribute('data-rotating', 'true');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('Second quote')).toBeInTheDocument();

    const dot = screen.getByRole('button', { name: 'Quote 1' });
    fireEvent.focus(dot);
    expect(fig).toHaveAttribute('data-rotating', 'false');
  });

  it('marks the active dot wide (18px) and the others 6px, with 44px hit areas', () => {
    stubMatchMedia(false);
    render(<HvTestimonialCarousel quotes={QUOTES} />);
    const buttons = screen.getAllByRole('button');
    const bars = buttons.map((b) => b.querySelector('[data-active]') as HTMLElement);
    expect(bars[0].className).toContain('w-[18px]');
    expect(bars[1].className).toContain('w-1.5');
    expect(buttons[0].className).toContain('h-11');
    expect(buttons[0].className).toContain('w-11');
  });

  it('does not start a timer under reduced motion but dots still work', () => {
    stubMatchMedia(true);
    render(<HvTestimonialCarousel quotes={QUOTES} interval={1000} />);
    expect(carousel()).toHaveAttribute('data-rotating', 'false');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('First quote')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quote 2' }));
    expect(screen.getByText('Second quote')).toBeInTheDocument();
  });

  it('renders nothing for an empty list and no dots for a single quote', () => {
    stubMatchMedia(false);
    const { container, rerender } = render(<HvTestimonialCarousel quotes={[]} />);
    expect(container.firstElementChild).toBeNull();
    rerender(<HvTestimonialCarousel quotes={[QUOTES[0]]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
