import { describe, expect, it } from 'vitest';
import { isAnalyticsExcludedUrl } from './vercel-analytics';

// The beforeSend filter: discovery questionnaire pageviews never reach Vercel
// Analytics. Pinned against both locales, trailing slashes, query strings and
// look-alike prefixes.

describe('isAnalyticsExcludedUrl', () => {
  it('drops /discovery/<id> and /ja/discovery/<id> (absolute or path-only, with or without a query)', () => {
    for (const url of [
      'https://honuvibe.ai/discovery/3f2a1c9e-0b7d-4e6a-9c1f-2d8b7a6e5f40',
      'https://honuvibe.ai/ja/discovery/3f2a1c9e-0b7d-4e6a-9c1f-2d8b7a6e5f40/',
      '/discovery/3f2a1c9e-0b7d-4e6a-9c1f-2d8b7a6e5f40?x=1',
      '/discovery',
    ]) {
      expect(isAnalyticsExcludedUrl(url), url).toBe(true);
    }
  });

  it('keeps every other page', () => {
    for (const url of ['https://honuvibe.ai/', '/about', '/ja/learn', '/discoveries', '/discovery-call', '/join/abc']) {
      expect(isAnalyticsExcludedUrl(url), url).toBe(false);
    }
  });
});
