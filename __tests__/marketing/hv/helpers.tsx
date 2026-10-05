import { vi } from 'vitest';

/**
 * jsdom has no matchMedia. Every hv motion component reads
 * (prefers-reduced-motion: reduce) through useReducedMotion, so tests stub it
 * explicitly for the motion-on and motion-off cases.
 */
export function stubMatchMedia(reduce: boolean) {
  const mql = {
    matches: reduce,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return mql;
}
