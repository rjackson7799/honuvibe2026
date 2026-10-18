// @vitest-environment jsdom
import { createElement, Suspense } from 'react';
import { renderToString } from 'react-dom/server';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetCatalogStoreForTests,
  CatalogUrlSync,
  resetCatalogState,
  setCatalogState,
  useCatalogState,
} from '@/components/marketing/learn/catalog-state';
import { DEFAULT_CATALOG_STATE } from '@/lib/learn/catalog';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
}));

function go(url: string) {
  window.history.replaceState({}, '', url);
}

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  __resetCatalogStoreForTests();
  go('/learn');
  nav.search = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('catalog-state store', () => {
  it('server snapshot is the default', () => {
    go('/learn?track=marketing_growth&q=seo');
    let seen: unknown = null;
    function Probe() {
      seen = useCatalogState();
      return null;
    }
    renderToString(createElement(Probe));
    expect(seen).toEqual(DEFAULT_CATALOG_STATE);
  });

  it('hydrates from ?track= after mount', () => {
    go('/learn?track=marketing_growth');
    const { result } = renderHook(() => useCatalogState());
    expect(result.current.track).toBe('marketing_growth');
  });

  it('invalid track falls back to all', () => {
    go('/learn?track=nope');
    const { result } = renderHook(() => useCatalogState());
    expect(result.current.track).toBe('all');
  });

  it('re-reads the URL when remounted after a client-side navigation', () => {
    go('/learn?track=build_with_ai');
    const first = renderHook(() => useCatalogState());
    expect(first.result.current.track).toBe('build_with_ai');
    first.unmount();
    go('/learn?track=marketing_growth');
    const second = renderHook(() => useCatalogState());
    expect(second.result.current.track).toBe('marketing_growth');
  });

  it('setCatalogState writes the URL without navigation and updates every subscriber', () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    const a = renderHook(() => useCatalogState());
    const b = renderHook(() => useCatalogState());
    act(() => setCatalogState({ query: 'seo' }));
    expect(spy).toHaveBeenCalled();
    // null state: Next's patched replaceState skips router sync for any state
    // carrying its own __NA marker, so passing history.state would leave the
    // router on the old URL (Next docs: replaceState(null, '', url)).
    expect(spy.mock.calls.at(-1)?.[0]).toBeNull();
    expect(String(spy.mock.calls.at(-1)?.[2])).toMatch(/\/learn\?q=seo$/);
    expect(window.location.pathname).toBe('/learn');
    expect(a.result.current.query).toBe('seo');
    expect(b.result.current.query).toBe('seo');
  });

  it('resetCatalogState clears the query string', () => {
    go('/learn?track=build_with_ai&free=1');
    const { result } = renderHook(() => useCatalogState());
    act(() => resetCatalogState());
    expect(window.location.pathname + window.location.search).toBe('/learn');
    expect(result.current).toEqual(DEFAULT_CATALOG_STATE);
  });

  it('scroll option scrolls #catalog smoothly, or instantly under reduced motion', () => {
    const el = document.createElement('section');
    el.id = 'catalog';
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    mockReducedMotion(false);
    act(() => setCatalogState({ track: 'build_with_ai' }, { scroll: true }));
    expect(el.scrollIntoView).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    mockReducedMotion(true);
    act(() => setCatalogState({ track: 'ai_essentials' }, { scroll: true }));
    expect(el.scrollIntoView).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  it('CatalogUrlSync follows a router navigation the store did not make', () => {
    go('/learn?track=marketing_growth');
    nav.search = 'track=marketing_growth';
    const { result } = renderHook(() => useCatalogState());
    const sync = render(createElement(Suspense, { fallback: null }, createElement(CatalogUrlSync)));
    expect(result.current.track).toBe('marketing_growth');

    // e.g. the header "Learn" link: Next pushes /learn without a popstate.
    go('/learn');
    nav.search = '';
    sync.rerender(createElement(Suspense, { fallback: null }, createElement(CatalogUrlSync)));
    expect(result.current).toEqual(DEFAULT_CATALOG_STATE);
  });

  it('preserves the /ja prefix', () => {
    go('/ja/learn');
    renderHook(() => useCatalogState());
    act(() => setCatalogState({ freeOnly: true }));
    expect(window.location.pathname + window.location.search).toBe('/ja/learn?free=1');
  });
});
