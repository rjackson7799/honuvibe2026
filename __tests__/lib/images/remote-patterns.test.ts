import { describe, it, expect, vi } from 'vitest';
import {
  REMOTE_IMAGE_PATTERNS,
  isRenderableRemoteImage,
} from '@/lib/images/remote-patterns';

// next.config.ts calls createNextIntlPlugin() at module scope, which is a
// build-time concern and not loadable from a jsdom test. Stub it to an identity
// wrapper so the module's own exports — the thing under test — can be imported.
vi.mock('next-intl/plugin', () => ({
  default: () => (config: unknown) => config,
}));

describe('isRenderableRemoteImage', () => {
  it('accepts an allowed host with an allowed pathname', () => {
    expect(
      isRenderableRemoteImage('https://cdn.sanity.io/images/abc/def/x.png'),
    ).toBe(true);
    expect(
      isRenderableRemoteImage(
        'https://project.supabase.co/storage/v1/object/public/logos/x.png',
      ),
    ).toBe(true);
  });

  it('accepts a pattern with no pathname constraint on any path', () => {
    expect(isRenderableRemoteImage('https://placehold.co/120x120')).toBe(true);
    expect(isRenderableRemoteImage('https://placehold.co/')).toBe(true);
  });

  it('rejects an allowed host with a disallowed pathname', () => {
    // The exact case a host-only check would wrongly accept.
    expect(
      isRenderableRemoteImage('https://project.supabase.co/not-storage/x.png'),
    ).toBe(false);
    expect(isRenderableRemoteImage('https://cdn.sanity.io/files/abc/x.pdf')).toBe(
      false,
    );
  });

  it('rejects http on an otherwise allowed host', () => {
    expect(
      isRenderableRemoteImage('http://cdn.sanity.io/images/abc/def/x.png'),
    ).toBe(false);
  });

  it('matches a leading wildcard against exactly one label', () => {
    expect(
      isRenderableRemoteImage(
        'https://a.b.supabase.co/storage/v1/object/public/x.png',
      ),
    ).toBe(false);
    expect(
      isRenderableRemoteImage(
        'https://supabase.co/storage/v1/object/public/x.png',
      ),
    ).toBe(false);
  });

  it('rejects a URL carrying credentials', () => {
    expect(
      isRenderableRemoteImage('https://user:pass@cdn.sanity.io/images/a/b/x.png'),
    ).toBe(false);
  });

  it('rejects an explicit port', () => {
    expect(
      isRenderableRemoteImage('https://cdn.sanity.io:8443/images/a/b/x.png'),
    ).toBe(false);
  });

  it('rejects a malformed URL', () => {
    expect(isRenderableRemoteImage('not a url')).toBe(false);
    expect(isRenderableRemoteImage('')).toBe(false);
    expect(isRenderableRemoteImage(null)).toBe(false);
    expect(isRenderableRemoteImage(undefined)).toBe(false);
  });

  it('rejects a root-relative path (D12)', () => {
    // new URL() throws without a base; the contract makes that explicit rather
    // than an accident of the parser. Callers degrade to the monogram.
    expect(isRenderableRemoteImage('/logo.svg')).toBe(false);
  });

  it('rejects a protocol-relative URL', () => {
    expect(isRenderableRemoteImage('//cdn.sanity.io/images/a/b/x.png')).toBe(false);
  });
});

describe('next.config.ts drift', () => {
  it('carries exactly the shared patterns in images.remotePatterns', async () => {
    // If this fails, next.config.ts and the runtime validator have diverged and
    // an off-pattern URL will pass the check then throw at render.
    const { nextConfig } = await import('@/next.config');
    expect(nextConfig.images?.remotePatterns).toEqual([...REMOTE_IMAGE_PATTERNS]);
  });
});
