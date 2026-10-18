import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl/plugin', () => ({ default: () => (config: unknown) => config }));

import { nextConfig } from '@/next.config';

type Redirect = { source: string; destination: string; permanent: boolean };

async function redirects(): Promise<Redirect[]> {
  return (await nextConfig.redirects!()) as Redirect[];
}

/**
 * Unit 2a retires /free-lesson and the /sandbox landing into /learn. The demo
 * apps under /sandbox/<slug> (and /sandbox/*.webp) must keep resolving, so the
 * sandbox redirect is exact-match only — never /sandbox/:path*.
 */
describe('Unit 2a retirements', () => {
  it.each([
    ['/free-lesson', '/learn'],
    ['/ja/free-lesson', '/ja/learn'],
    ['/sandbox', '/learn'],
    ['/ja/sandbox', '/ja/learn'],
  ])('%s → %s as a temporary 307', async (source, destination) => {
    const match = (await redirects()).find((r) => r.source === source);
    expect(match).toEqual({ source, destination, permanent: false });
  });

  it('never redirects the sandbox demo apps', async () => {
    const sources = (await redirects()).map((r) => r.source);
    expect(sources.filter((s) => /^(\/ja)?\/sandbox\//.test(s))).toEqual([]);
    expect(sources).not.toContain('/sandbox/:path*');
  });
});
