/**
 * Ops for the private `preview-feedback-images` bucket (service role).
 *
 *   node --env-file=.env.local scripts/preview-images.mjs purge <slug|preview_id>
 *   node --env-file=.env.local scripts/preview-images.mjs reconcile [--grace-hours 24]
 *
 * purge      removes EVERY object under <preview_id>/ (use before deleting a preview).
 *            Idempotent: a second run removes 0.
 * reconcile  scans the whole bucket and removes objects older than the grace
 *            period whose <submission_id> has no preview_feedback row (left behind
 *            by a failed/ambiguous insert). Never removes an object that has a row.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * The logic is exported as functions over a supabase-js-shaped client so tests
 * (and a live run against the test project) can drive it.
 */

import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUCKET = 'preview-feedback-images';
const PAGE = 100;
const BATCH = 100;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_RE = new RegExp(`^${UUID}$`, 'i');
const OBJECT_RE = new RegExp(`^(${UUID})(\\.thumb)?\\.jpg$`, 'i');

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function removeAll(bucket, paths) {
  let removed = 0;
  for (const batch of chunk(paths, BATCH)) {
    const { data, error } = await bucket.remove(batch);
    if (error) throw new Error(`remove failed: ${error.message}`);
    removed += Array.isArray(data) ? data.length : batch.length;
  }
  return removed;
}

/** List every file name directly under `prefix` (paged, 100 at a time). Never mutates. */
async function listAll(bucket, prefix) {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`list failed: ${error.message}`);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/**
 * Remove everything under `<previewId>/`. Lists the whole prefix first, then
 * removes in batches of 100 (so removal can't shift paging offsets).
 */
export async function purgePrefix(client, previewId) {
  if (!UUID_RE.test(previewId)) throw new Error(`not a preview id: ${previewId}`);
  const bucket = client.storage.from(BUCKET);
  const files = await listAll(bucket, previewId);
  const paths = files.filter((f) => f.id !== null).map((f) => `${previewId}/${f.name}`);
  const removed = await removeAll(bucket, paths);
  return { removed };
}

/**
 * Remove orphaned objects: older than `graceHours` AND no preview_feedback row
 * with their submission id. Returns { scanned, removed, kept, ignored }.
 */
export async function reconcile(client, { graceHours = 24, now = Date.now() } = {}) {
  if (typeof graceHours !== 'number' || !Number.isFinite(graceHours) || graceHours < 0) {
    throw new Error('graceHours must be a number >= 0');
  }
  const bucket = client.storage.from(BUCKET);
  const cutoff = now - graceHours * 3600_000;

  // Pass 1: read-only scan of every folder (= preview id).
  const candidates = []; // { path, id } older than the cutoff
  let scanned = 0;
  let ignored = 0;
  let kept = 0;
  const folders = (await listAll(bucket, '')).filter((f) => f.id === null).map((f) => f.name);
  for (const folder of folders) {
    for (const f of (await listAll(bucket, folder)).filter((x) => x.id !== null)) {
      scanned += 1;
      const m = OBJECT_RE.exec(f.name);
      if (!m) {
        ignored += 1;
        continue;
      }
      const created = Date.parse(f.created_at ?? '');
      // Unknown age -> treat as fresh (never delete what we can't date).
      if (!Number.isFinite(created) || created > cutoff) {
        kept += 1;
        continue;
      }
      candidates.push({ path: `${folder}/${f.name}`, id: m[1].toLowerCase() });
    }
  }

  // Pass 2: which candidate ids still have a row?
  const ids = [...new Set(candidates.map((c) => c.id))];
  const live = new Set();
  for (const batch of chunk(ids, PAGE)) {
    const { data, error } = await client.from('preview_feedback').select('id').in('id', batch);
    if (error) throw new Error(`row lookup failed: ${error.message}`);
    for (const r of data ?? []) live.add(String(r.id).toLowerCase());
  }

  const orphans = candidates.filter((c) => !live.has(c.id)).map((c) => c.path);
  kept += candidates.length - orphans.length;
  const removed = await removeAll(bucket, orphans);
  return { scanned, removed, kept, ignored };
}

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

async function resolvePreviewId(client, arg) {
  if (UUID_RE.test(arg)) return arg.toLowerCase();
  const { data, error } = await client.from('client_previews').select('id').eq('slug', arg).maybeSingle();
  if (error) throw new Error(`slug lookup failed: ${error.message}`);
  if (!data) throw new Error(`no preview with slug "${arg}"`);
  return data.id;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

  const [cmd, ...rest] = process.argv.slice(2);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    if (cmd === 'purge') {
      if (rest.length !== 1) fail('usage: purge <slug|preview_id>');
      const previewId = await resolvePreviewId(client, rest[0]);
      const { removed } = await purgePrefix(client, previewId);
      console.log(`purge ${previewId}: removed ${removed}`);
    } else if (cmd === 'reconcile') {
      let graceHours = 24;
      if (rest.length > 0) {
        if (rest[0] !== '--grace-hours' || rest.length !== 2) fail('usage: reconcile [--grace-hours N]');
        graceHours = Number(rest[1]);
        if (rest[1].trim() === '' || !Number.isFinite(graceHours) || graceHours < 0) {
          fail('--grace-hours must be a number >= 0');
        }
      }
      const r = await reconcile(client, { graceHours });
      console.log(
        `reconcile (grace ${graceHours}h): scanned ${r.scanned}, removed ${r.removed}, kept ${r.kept}, ignored ${r.ignored}`,
      );
    } else {
      fail('usage: preview-images.mjs purge <slug|preview_id> | reconcile [--grace-hours N]');
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
