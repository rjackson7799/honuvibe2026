import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * /learn must prerender (plan Unit 2a): one cookies() call or a `searchParams`
 * read anywhere on its render path turns `/learn` and `/ja/learn` into dynamic,
 * uncached routes. Filter state is read from the URL on the client instead.
 * Same walker as home-static-guard.test.ts.
 */

const PAGE = 'app/[locale]/learn/page.tsx';
// Modules /learn owns or relies on for its data; the graph walk stays inside these.
const WALK_ROOTS = [
  'components/marketing/learn/',
  'lib/learn/',
  'lib/proof/',
  'lib/vault/catalog',
  'lib/tracks',
];

function resolve(spec: string, from: string): string | null {
  const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? join(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    const path = normalize(candidate).replace(/\\/g, '/');
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}

/** Source without comments, LF line endings (comments may mention cookies() by name). */
const code = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"])\/\/.*$/gm, '$1');

const importsOf = (src: string) =>
  [...src.matchAll(/^\s*(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm)].map((m) => ({
    names: m[1],
    spec: m[2],
  }));

function walk(): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = [PAGE];
  while (queue.length) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    const src = code(file);
    seen.set(file, src);
    for (const { spec } of importsOf(src)) {
      const path = resolve(spec, file);
      if (path && WALK_ROOTS.some((root) => path.startsWith(root))) queue.push(path);
    }
  }
  return seen;
}

describe('/learn stays static', () => {
  const graph = walk();

  it('walks the page and the Learn modules', () => {
    expect(graph.has(PAGE)).toBe(true);
    expect(graph.has('components/marketing/learn/learn-catalog.tsx')).toBe(true);
    expect(graph.has('lib/learn/public-courses.ts')).toBe(true);
    expect(graph.has('lib/vault/catalog.ts')).toBe(true);
    expect(graph.has('lib/proof/queries.ts')).toBe(true);
  });

  it.each([...graph.keys()])('%s reads no request cookies or searchParams', (file) => {
    const src = graph.get(file)!;
    for (const { names, spec } of importsOf(src)) {
      expect(spec, `${file} imports next/headers`).not.toBe('next/headers');
      if (spec === '@/lib/supabase/server') {
        // createAdminClient (service role, no cookies) is fine; the cookie-bound createClient is not.
        expect(names, `${file} imports the cookie-bound createClient`).not.toMatch(/\bcreateClient\b/);
      }
    }
    expect(src).not.toMatch(/\bcookies\s*\(/);
    expect(src).not.toMatch(/\bgetVaultTrending\b/);
    expect(src).not.toMatch(/\bsearchParams\b/);
  });

  it('never reads the cookie-client course or vault queries', () => {
    const page = graph.get(PAGE)!;
    const specs = importsOf(page).map((i) => i.spec);
    expect(specs).not.toContain('@/lib/courses/queries');
    expect(specs).not.toContain('@/lib/vault/queries');
  });
});
