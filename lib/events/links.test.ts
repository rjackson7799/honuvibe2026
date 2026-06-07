import { describe, it, expect } from 'vitest';
import { buildEventPath, buildEventUrl, buildEventInviteRedirect } from './links';

describe('event links', () => {
  it('builds the locale-aware event path under the dashboard', () => {
    expect(buildEventPath('intro-ai', 'en')).toBe('/learn/dashboard/events/intro-ai');
    expect(buildEventPath('intro-ai', 'ja')).toBe('/ja/learn/dashboard/events/intro-ai');
  });

  it('builds the absolute event URL', () => {
    expect(buildEventUrl('https://honuvibe.ai', 'intro-ai', 'ja')).toBe(
      'https://honuvibe.ai/ja/learn/dashboard/events/intro-ai',
    );
  });

  it('strips a trailing slash from origin', () => {
    expect(buildEventUrl('https://honuvibe.ai/', 'x', 'en')).toBe(
      'https://honuvibe.ai/learn/dashboard/events/x',
    );
  });

  it('builds a callback redirect using ?redirect= (the param the callback reads)', () => {
    expect(buildEventInviteRedirect('https://honuvibe.ai', 'intro-ai', 'ja')).toBe(
      'https://honuvibe.ai/api/auth/callback?redirect=%2Fja%2Flearn%2Fdashboard%2Fevents%2Fintro-ai',
    );
  });
});
