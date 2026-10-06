import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl/plugin', () => ({ default: () => (config: unknown) => config }));

import { nextConfig } from '@/next.config';

type Redirect = { source: string; destination: string; permanent: boolean };

async function redirects(): Promise<Redirect[]> {
  return (await nextConfig.redirects!()) as Redirect[];
}

function find(list: Redirect[], source: string) {
  return list.find((r) => r.source === source);
}

/**
 * Redesign Unit 0B routing: the business door is /partner, the partner portal
 * moved to /portal, auth moved to /signin + /signup, and /build is a real page
 * again. Every EN redirect needs its /ja twin (next.config has no i18n block).
 */
describe('Unit 0B redirects', () => {
  it.each([
    ['/partnerships', '/partner'],
    ['/partnerships/apply', '/partner#apply'],
    ['/organizations', '/partner'],
    ['/become-an-instructor', '/partner'],
    ['/learn/organizations', '/partner'],
    ['/partner/:section(courses|vault|settings)', '/portal/:section'],
    ['/partner/:slug/community', '/portal/:slug/community'],
    ['/learn/auth', '/signin'],
  ])('%s → %s, with a /ja twin', async (source, destination) => {
    const list = await redirects();
    expect(find(list, source)?.destination).toBe(destination);
    expect(find(list, `/ja${source}`)?.destination).toBe(`/ja${destination}`);
  });

  it('no longer sends /build to /explore', async () => {
    const list = await redirects();
    expect(list.some((r) => /^(\/ja)?\/build$/.test(r.source))).toBe(false);
  });

  it('never redirects /partner itself or /learn/auth/reset', async () => {
    const list = await redirects();
    const sources = list.map((r) => r.source);
    expect(sources).not.toContain('/partner');
    expect(sources).not.toContain('/ja/partner');
    expect(sources.some((s) => s.startsWith('/learn/auth/') || s.startsWith('/ja/learn/auth/'))).toBe(false);
  });

  it('keeps the new redirects temporary during the soak window', async () => {
    const list = await redirects();
    for (const source of ['/partnerships', '/organizations', '/learn/auth', '/partner/:slug/community']) {
      expect(find(list, source)?.permanent).toBe(false);
    }
  });
});
