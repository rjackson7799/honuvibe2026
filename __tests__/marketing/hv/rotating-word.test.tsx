import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HvRotatingWord } from '@/components/marketing/hv/motion/rotating-word';
import { stubMatchMedia } from './helpers';

const ITEMS = ['a prompt kit', 'a booking page', 'a Monday report'];

describe('HvRotatingWord', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cycles through the items on the interval', () => {
    stubMatchMedia(false);
    render(<HvRotatingWord items={ITEMS} interval={500} />);
    const word = () => screen.getByTestId('hv-rotating-word').textContent;
    expect(word()).toBe('a prompt kit');
    act(() => vi.advanceTimersByTime(500));
    expect(word()).toBe('a booking page');
    act(() => vi.advanceTimersByTime(1000));
    expect(word()).toBe('a prompt kit');
    expect(screen.getByTestId('hv-rotating-word').className).toContain('animate-hv-rise');
  });

  it('stays on the first item with no animation under reduced motion', () => {
    stubMatchMedia(true);
    render(<HvRotatingWord items={ITEMS} interval={500} />);
    act(() => vi.advanceTimersByTime(3000));
    const el = screen.getByTestId('hv-rotating-word');
    expect(el.textContent).toBe('a prompt kit');
    expect(el.className).not.toContain('animate-hv-rise');
  });

  it('exposes the first item to assistive tech and hides the rotating copy', () => {
    stubMatchMedia(false);
    const { container } = render(<HvRotatingWord items={ITEMS} />);
    expect(container.querySelector('.sr-only')?.textContent).toBe('a prompt kit');
    expect(screen.getByTestId('hv-rotating-word')).toHaveAttribute('aria-hidden', 'true');
  });
});
