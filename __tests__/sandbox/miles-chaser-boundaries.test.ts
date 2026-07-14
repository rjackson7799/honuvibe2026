import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Static isolation contract for the demo tree: no network, no vendor SDKs,
 * no locale-aware Link, no unprefixed internal navigation, no source-app
 * import paths. Any hit is a porting mistake that manual QA might miss.
 */
const ROOTS = ['app/sandbox', 'components/sandbox', 'lib/sandbox/miles-chaser'];
const repo = path.resolve(__dirname, '../..');

function collect(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return collect(p);
    return /\.(ts|tsx|css)$/.test(e.name) ? [p] : [];
  });
}

const FORBIDDEN: Array<[RegExp, string]> = [
  [/@\/i18n\/navigation/, 'demo must use plain next/link'],
  [/\bfetch\s*\(/, 'no network calls — the store is the backend'],
  [/from\s+['"][^'"]*(supabase|posthog|stripe)/i, 'vendor SDKs are excluded'],
  [/from\s+['"]@\/hooks\//, 'source-app import path leaked'],
  [/from\s+['"]@\/types\//, 'source-app import path leaked'],
  [/(href=|push\(|replace\(|location\.href\s*=\s*)["'`]\/(dashboard|trips|path-to-gold|micro-vacations|settings|ocr|audit|csv-import|help)\b/, 'unprefixed internal navigation'],
];

describe('miles-chaser demo tree boundaries', () => {
  const files = ROOTS.flatMap((r) => collect(path.join(repo, r)));
  it('scans a non-trivial tree', () => expect(files.length).toBeGreaterThan(20));
  for (const [re, why] of FORBIDDEN) {
    it(`contains no ${re}`, () => {
      const hits = files
        .filter((f) => re.test(readFileSync(f, 'utf8')))
        .map((f) => path.relative(repo, f));
      expect(hits, why).toEqual([]);
    });
  }
});
