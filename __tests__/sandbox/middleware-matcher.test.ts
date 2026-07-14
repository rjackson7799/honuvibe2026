import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The middleware matcher is Next's route filter — if it drifts, demo routes
 * get locale-prefixed (404s) or marketing routes lose intl handling.
 * Next requires `config.matcher` to be a static literal, so we can't import
 * it; instead we EXTRACT it from middleware.ts source and assert both the
 * expected literal and its behavior as a regex. (The full middleware function
 * is not unit-tested here — it imports supabase/intl and needs env; the
 * redirect behavior is covered by the prod-mode curl contract in this task.)
 */
const source = readFileSync(path.resolve(__dirname, '../../middleware.ts'), 'utf8');
const match = source.match(/matcher:\s*'([^']+)'/);
// The extraction sees TS source text, where `\\` spells one runtime backslash.
// Unescape so we compare runtime value to runtime value.
const MATCHER = (match?.[1] ?? '').replace(/\\\\/g, '\\');

const EXPECTED =
  '/((?!api|trpc|_next|_vercel|studio(?:$|/)|sandbox/|.*\\..*).*)';

const toRegex = (m: string) => new RegExp(`^${m.replace(/\//g, '\\/')}$`);

describe('middleware matcher — sandbox routing contract', () => {
  it('middleware.ts contains exactly the expected matcher', () => {
    expect(MATCHER).toBe(EXPECTED);
  });

  const re = toRegex(EXPECTED);
  it.each([
    ['/sandbox', true],           // EN landing — needs intl
    ['/ja/sandbox', true],        // JP landing — needs intl
    ['/sandbox/', false],         // demo namespace — excluded
    ['/sandbox/miles-chaser', false],
    ['/sandbox/miles-chaser/trips/abc', false],
    ['/sandboxish', true],        // prefix confusion — still a normal route
    ['/ja/sandbox/miles-chaser', true], // matched so the redirect rule can run
    ['/learn', true],
    ['/favicon.ico', false],      // dotted assets excluded
    ['/sandbox/miles-chaser/x.png', false],
  ])('%s → middleware runs: %s', (p, expected) => {
    expect(re.test(p)).toBe(expected);
  });
});
