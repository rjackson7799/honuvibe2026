'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function canQuery(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function subscribe(onChange: () => void): () => void {
  if (!canQuery()) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return canQuery() ? window.matchMedia(QUERY).matches : false;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * True when the visitor asks for reduced motion. Server-rendered as `false`
 * (motion on) and corrected on hydration; every hv motion component treats
 * `true` as "render the static end state and start no timers".
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-hook variant for effects that run once (e.g. the reveal orchestrator). */
export function prefersReducedMotion(): boolean {
  return getSnapshot();
}
