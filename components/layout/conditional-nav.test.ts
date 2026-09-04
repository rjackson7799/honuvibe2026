import { describe, it, expect } from 'vitest';
import { isAuthShellRoute } from './conditional-nav';

// isAuthShellRoute decides which routes drop the legacy dark global <Nav />
// (and its pt-14 padding). Routes that render their own HonuVibe.AI wordmark
// inside a light marketing card must be listed here, or the page shows two
// logos stacked — the bug the tokenized survey pages shipped with. The
// negative lookahead that keeps the legacy /survey/ai-essentials page on the
// dark Nav is exact-match only; these tests pin both sides of it.

const CHROMELESS = [
  '/join',
  '/join/abc123',
  '/ja/join/abc123',
  '/admin',
  '/admin/studio/leads',
  '/learn/auth',
  '/learn/dashboard',
  '/ja/learn/vault',
  // Tokenized course survey — own wordmark, own padding.
  '/survey/intro-to-ai',
  '/survey/intro-to-ai/',
  '/ja/survey/intro-to-ai',
  // The exclusion is for the exact legacy slug only.
  '/survey/ai-essentials-v2',
  // Tokenized event survey — own wordmark, own padding.
  '/events/summer-meetup/survey',
  '/events/summer-meetup/survey/',
  '/ja/events/summer-meetup/survey',
];

const KEEPS_NAV = [
  '/',
  '/learn',
  '/learn/courses',
  '/about',
  // Legacy survey page: no marketing shell, built for the dark Nav.
  '/survey/ai-essentials',
  '/survey/ai-essentials/',
  '/ja/survey/ai-essentials',
  // No slug → not a survey page.
  '/survey',
  '/survey/',
  // Event detail and list keep the Nav; only the /survey child is a card.
  '/events',
  '/events/summer-meetup',
  '/events/summer-meetup/other',
  // Prefix must not bleed into unrelated routes.
  '/joined',
  '/surveys/intro-to-ai',
  '/administration',
];

describe('isAuthShellRoute', () => {
  it.each(CHROMELESS)('drops the global Nav for %s', (pathname) => {
    expect(isAuthShellRoute(pathname)).toBe(true);
  });

  it.each(KEEPS_NAV)('keeps the global Nav for %s', (pathname) => {
    expect(isAuthShellRoute(pathname)).toBe(false);
  });
});
