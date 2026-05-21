import { describe, it, expect } from 'vitest';
import { isSafeInternalRedirect, sanitizeRedirect } from './safe-redirect';

describe('isSafeInternalRedirect', () => {
  it('accepts known internal prefixes', () => {
    expect(isSafeInternalRedirect('/learn/dashboard')).toBe(true);
    expect(isSafeInternalRedirect('/learn')).toBe(true);
    expect(isSafeInternalRedirect('/ja/learn/dashboard/billing')).toBe(true);
    expect(isSafeInternalRedirect('/api/stripe/subscribe?tier=community')).toBe(true);
    expect(isSafeInternalRedirect('/api/stripe/subscribe?tier=vault&locale=ja')).toBe(true);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeInternalRedirect('//evil.com')).toBe(false);
    expect(isSafeInternalRedirect('//evil.com/learn')).toBe(false);
  });

  it('rejects backslash-prefixed URLs', () => {
    expect(isSafeInternalRedirect('\\\\evil.com')).toBe(false);
    expect(isSafeInternalRedirect('/\\evil.com')).toBe(false);
  });

  it('rejects absolute and javascript URLs', () => {
    expect(isSafeInternalRedirect('http://evil.com')).toBe(false);
    expect(isSafeInternalRedirect('https://evil.com')).toBe(false);
    expect(isSafeInternalRedirect('javascript:alert(1)')).toBe(false);
    expect(isSafeInternalRedirect('data:text/html,<script>')).toBe(false);
  });

  it('rejects paths outside the allowlist', () => {
    expect(isSafeInternalRedirect('/admin')).toBe(false);
    expect(isSafeInternalRedirect('/random')).toBe(false);
    expect(isSafeInternalRedirect('/')).toBe(false);
  });

  it('rejects empty, null, undefined', () => {
    expect(isSafeInternalRedirect(null)).toBe(false);
    expect(isSafeInternalRedirect(undefined)).toBe(false);
    expect(isSafeInternalRedirect('')).toBe(false);
  });
});

describe('sanitizeRedirect', () => {
  it('returns the value when safe', () => {
    expect(sanitizeRedirect('/learn/dashboard', '/learn')).toBe('/learn/dashboard');
  });
  it('returns the fallback when unsafe', () => {
    expect(sanitizeRedirect('//evil.com', '/learn')).toBe('/learn');
    expect(sanitizeRedirect(null, '/learn')).toBe('/learn');
  });
});
