import { describe, it, expect } from 'vitest';
import { isMarketingPath, isMarketingPathWithLocale } from '@/lib/marketing-routes';

/**
 * Marketing-route detection is the seam between the existing dark app shell
 * and the new <MarketingShell>. Both sides depend on it being correct, so
 * regressions here visually break the site (double-mounted nav, wrong colors).
 *
 * Test all 6 in-scope marketing routes both with and without locale prefix,
 * plus a representative set of out-of-scope routes that MUST NOT match
 * (auth, dashboard, vault, admin, course-detail, partner pages, etc.).
 */

describe('isMarketingPath (locale-stripped pathnames from next-intl)', () => {
  it.each([
    ['/', true],
    ['/learn', true],
    ['/explore', true],
    ['/partnerships', true],
    ['/about', true],
    ['/contact', true],
    // trailing slash should still match
    ['/learn/', true],
    ['/about/', true],
  ])('matches %s -> %s', (path, expected) => {
    expect(isMarketingPath(path)).toBe(expected);
  });

  it.each([
    // Children of /learn are NOT marketing — they belong to the auth-gated app
    ['/learn/dashboard', false],
    ['/learn/dashboard/courses', false],
    ['/learn/vault', false],
    ['/learn/vault/series/abc', false],
    ['/learn/auth', false],
    ['/learn/some-course-slug', false],
    ['/learn/some-course-slug/checkout', false],
    // Other non-marketing routes
    ['/admin', false],
    ['/admin/courses', false],
    ['/instructor', false],
    ['/partner', false],
    ['/partners/vertice-society', false],
    ['/partners/smashhaus', false],
    ['/honuhub', false],
    ['/blog', false],
    ['/blog/some-post', false],
    ['/glossary', false],
    ['/glossary/transformer', false],
    ['/privacy', false],
    ['/terms', false],
    ['/cookies', false],
    ['/build', false],
    ['/community', false],
    ['/resources', false],
    ['/newsletter', false],
    ['/become-an-instructor', false],
  ])('does not match %s', (path, expected) => {
    expect(isMarketingPath(path)).toBe(expected);
  });
});

describe('isMarketingPathWithLocale (locale-prefixed pathnames from next/navigation)', () => {
  it.each([
    // Root in both locales
    ['/', true],
    ['/ja', true],
    ['/ja/', true],
    // Marketing routes prefixed with /ja
    ['/ja/learn', true],
    ['/ja/explore', true],
    ['/ja/partnerships', true],
    ['/ja/about', true],
    ['/ja/contact', true],
    // EN versions (no prefix) still match
    ['/learn', true],
    ['/explore', true],
    ['/partnerships', true],
    ['/about', true],
    ['/contact', true],
  ])('matches %s -> true', (path) => {
    expect(isMarketingPathWithLocale(path)).toBe(true);
  });

  it.each([
    // Auth-gated routes in both locales must NOT match
    ['/learn/dashboard', false],
    ['/ja/learn/dashboard', false],
    ['/learn/vault', false],
    ['/ja/learn/vault', false],
    ['/admin', false],
    ['/ja/admin', false],
    ['/instructor', false],
    ['/ja/instructor', false],
    // Course slug deep links
    ['/learn/ai-essentials', false],
    ['/ja/learn/ai-essentials', false],
    // Partners + bespoke partner
    ['/partners/smashhaus', false],
    ['/ja/partners/smashhaus', false],
    // Honuhub kept public but out-of-scope for marketing rebuild
    ['/honuhub', false],
    ['/ja/honuhub', false],
  ])('does not match %s', (path) => {
    expect(isMarketingPathWithLocale(path)).toBe(false);
  });

  // Defensive: paths that LOOK like a locale prefix but aren't (should treat as non-marketing)
  it('does not falsely match a route whose first segment merely starts with "ja"', () => {
    expect(isMarketingPathWithLocale('/japan/community')).toBe(false);
    expect(isMarketingPathWithLocale('/jaguar')).toBe(false);
  });
});
