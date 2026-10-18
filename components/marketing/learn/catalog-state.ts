'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DEFAULT_CATALOG_STATE,
  normalizeQuery,
  parseCatalogParams,
  serializeCatalogParams,
  type CatalogState,
} from '@/lib/learn/catalog';

/**
 * The /learn filter state (`?track=&q=&free=1`), shared by the search, the
 * grid and the sidebar. The page is prerendered and never reads
 * `searchParams`: the server snapshot is the default (full catalog), and the
 * URL is read on the client after hydration. Writes go through
 * `history.replaceState(null, …)` — never `router.replace`, which would refetch
 * the RSC payload. The null state matters: Next's patched replaceState only
 * syncs its router (and useSearchParams) when the state lacks its own `__NA`
 * marker, which `history.state` always carries.
 */

let snapshot: CatalogState | null = null;
const listeners = new Set<() => void>();

function readUrl(): CatalogState {
  return parseCatalogParams(window.location.search);
}

function emit() {
  for (const listener of listeners) listener();
}

function onPopState() {
  snapshot = readUrl();
  emit();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    // First subscriber of this visit: a client-side navigation (e.g. Home's
    // `/learn?track=…` link) may have changed the URL since the last read.
    snapshot = readUrl();
    window.addEventListener('popstate', onPopState);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('popstate', onPopState);
  };
}

function getSnapshot(): CatalogState {
  if (snapshot === null) snapshot = readUrl();
  return snapshot;
}

function getServerSnapshot(): CatalogState {
  return DEFAULT_CATALOG_STATE;
}

export function useCatalogState(): CatalogState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function write(next: CatalogState, scroll: boolean) {
  snapshot = next;
  const { pathname, hash } = window.location;
  window.history.replaceState(null, '', pathname + serializeCatalogParams(next) + hash);
  emit();
  if (scroll) {
    document.getElementById('catalog')?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}

/**
 * Re-reads the URL whenever Next's router changes it (e.g. the header "Learn"
 * link pushing /learn while a filter is on, which fires no popstate). Renders
 * nothing; mount it inside its own <Suspense fallback={null}> so only this
 * island bails out of prerendering (useSearchParams), not the catalog.
 */
export function CatalogUrlSync(): null {
  // Null outside the App Router (component tests); nothing to follow then.
  const params = useSearchParams();
  const search = params ? params.toString() : '';
  useEffect(() => {
    const next = readUrl();
    if (snapshot === null || serializeCatalogParams(next) !== serializeCatalogParams(snapshot)) {
      snapshot = next;
      emit();
    }
  }, [search]);
  return null;
}

export function setCatalogState(patch: Partial<CatalogState>, opts?: { scroll?: boolean }): void {
  const next = { ...getSnapshot(), ...patch };
  write({ ...next, query: normalizeQuery(next.query) }, opts?.scroll ?? false);
}

export function resetCatalogState(): void {
  write(DEFAULT_CATALOG_STATE, false);
}

export function __resetCatalogStoreForTests(): void {
  snapshot = null;
  listeners.clear();
  window.removeEventListener('popstate', onPopState);
}
