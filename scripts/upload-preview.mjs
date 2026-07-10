/**
 * Upload a claude.ai/design HTML export to the private `client-previews`
 * Storage bucket so the gate route (app/api/preview/...) can stream it behind a
 * password. Files go DIRECT to Storage with the service-role key — never through
 * a route (exports run 7–8 MB, past the ~4.5 MB buffered-response cap).
 *
 * Usage:
 *   node --env-file=.env.local scripts/upload-preview.mjs <export-dir> <slug> [--entry index.html]
 *
 * This script uploads FILES ONLY. It does NOT insert the `client_previews` row —
 * the studio-client-preview skill (or you) runs the SQL upsert separately. Both
 * halves are idempotent (upload upserts objects; the SQL upserts on slug), so
 * re-running the whole procedure is safe.
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const BUCKET = 'client-previews';
const SLUG_RE = /^[a-z0-9-]{8,80}$/;

// Content-type map — duplicated from lib/previews/gate.ts (a .mjs script can't
// import the TS helper). Keep the two in sync.
const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

function contentTypeFor(filename) {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  let entry = 'index.html';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--entry') {
      entry = argv[i + 1];
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  return { exportDir: positional[0], slug: positional[1], entry };
}

async function main() {
  const { exportDir, slug, entry } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    fail(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Run with:  node --env-file=.env.local scripts/upload-preview.mjs <export-dir> <slug>',
    );
  }
  if (!exportDir || !slug) {
    fail(
      'Usage: node --env-file=.env.local scripts/upload-preview.mjs <export-dir> <slug> [--entry index.html]',
    );
  }
  if (!SLUG_RE.test(slug)) {
    fail(`Slug "${slug}" must match ^[a-z0-9-]{8,80}$ (lowercase, digits, hyphens).`);
  }
  if (!entry || entry.includes('/') || entry.includes('\\')) {
    fail(`--entry "${entry}" must be a bare file name (no path separators).`);
  }

  const dirStat = await stat(exportDir).catch(() => null);
  if (!dirStat || !dirStat.isDirectory()) {
    fail(`Export dir "${exportDir}" does not exist or is not a directory.`);
  }
  const entryStat = await stat(join(exportDir, entry)).catch(() => null);
  if (!entryStat || !entryStat.isFile()) {
    fail(`Entry file "${entry}" was not found in "${exportDir}".`);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const entries = await readdir(exportDir, { recursive: true, withFileTypes: true });
  let uploaded = 0;
  let skippedSymlinks = 0;

  for (const dirent of entries) {
    // Node 20.12+ exposes parentPath; older versions use the (now-deprecated) path.
    const parent = dirent.parentPath ?? dirent.path;
    const abs = join(parent, dirent.name);
    const rel = relative(exportDir, abs);
    const posixRel = rel.split(sep).join('/');

    if (dirent.isSymbolicLink()) {
      skippedSymlinks += 1;
      continue;
    }
    if (!dirent.isFile()) continue; // skip directories and anything non-regular

    // Defense in depth: after normalizing to POSIX, a '..' or stray '\' means a
    // crafted name that could escape the slug prefix — refuse the whole upload.
    if (posixRel.includes('..') || posixRel.includes('\\')) {
      fail(`Unsafe relative path "${posixRel}" — aborting upload.`);
    }

    const objectPath = `${slug}/${posixRel}`;
    const buffer = await readFile(abs);
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
      contentType: contentTypeFor(dirent.name),
      upsert: true,
    });
    if (error) {
      fail(`Failed to upload "${objectPath}": ${error.message}`);
    }
    uploaded += 1;
    console.log(`  ✓ ${objectPath}`);
  }

  if (uploaded === 0) {
    fail(`No files found under "${exportDir}".`);
  }

  console.log(`\nUploaded ${uploaded} file(s) to ${BUCKET}/${slug}/`);
  if (skippedSymlinks > 0) {
    console.log(`Skipped ${skippedSymlinks} symlink(s).`);
  }
  console.log(`\nEntry URL:  https://honuvibe.ai/api/preview/${slug}`);
  console.log('Next: insert the client_previews row (see the studio-client-preview skill).\n');
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
