import { describe, it, expect, vi } from 'vitest';

/**
 * The /sandbox landing was retired in redesign Unit 2a (307 → /learn), so the
 * sitemap advertises no /sandbox URL at all; demo routes (/sandbox/<slug>) are
 * noindexed standalone apps and were never listed.
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
  it('contains no /sandbox entry in either locale, landing or demo', async () => {
    const entries = await sitemap();
    const sandboxEntries = entries.filter((e) => /^\/(ja\/)?sandbox(\/|$)/.test(new URL(e.url).pathname));
    expect(sandboxEntries).toHaveLength(0);
    const sandboxAlternates = entries.flatMap((e) =>
      Object.values((e.alternates?.languages ?? {}) as Record<string, string>).filter((u) =>
        /^\/(ja\/)?sandbox(\/|$)/.test(new URL(u).pathname),
      ),
    );
    expect(sandboxAlternates).toEqual([]);
  });
});
