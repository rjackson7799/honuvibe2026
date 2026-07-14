import { describe, it, expect, vi } from 'vitest';

/**
 * Phase A done criterion (docs/plans/2026-07-13-sandbox-master.md): the
 * sitemap contains exactly the two localized Sandbox LANDING entries
 * (/sandbox with an en + /ja/sandbox alternate pair) and no demo entries —
 * demo routes (/sandbox/<slug>) are noindexed standalone apps and must never
 * be advertised to crawlers.
 *
 * The dynamic-content sources (Sanity, Supabase) are mocked empty; only the
 * static `routes` list is under test here.
 */

vi.mock('@/lib/sanity/client', () => ({
  sanityPublicClient: { fetch: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/lib/sanity/queries', () => ({
  allPostSlugsQuery: '',
  glossarySlugQuery: '',
  newsletterSlugQuery: '',
}));
vi.mock('@/lib/library/queries', () => ({
  getLibraryVideoSlugs: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/vault/queries', () => ({
  getVaultPublishedSlugs: vi.fn().mockResolvedValue([]),
  getVaultSeriesSlugs: vi.fn().mockResolvedValue([]),
}));

import sitemap from '@/app/sitemap';

describe('sitemap — sandbox entries', () => {
  it('contains exactly one /sandbox entry with EN + JA alternates and no demo entries', async () => {
    const entries = await sitemap();

    const sandboxEntries = entries.filter((e) =>
      new URL(e.url).pathname.startsWith('/sandbox'),
    );
    expect(sandboxEntries).toHaveLength(1);

    const landing = sandboxEntries[0];
    expect(new URL(landing.url).pathname).toBe('/sandbox');
    const languages = landing.alternates?.languages as Record<string, string>;
    expect(new URL(languages.en).pathname).toBe('/sandbox');
    expect(new URL(languages.ja).pathname).toBe('/ja/sandbox');

    // No demo entries in either locale form.
    const demoEntries = entries.filter((e) => {
      const path = new URL(e.url).pathname;
      return /^\/(ja\/)?sandbox\/.+/.test(path);
    });
    expect(demoEntries).toHaveLength(0);
  });
});
