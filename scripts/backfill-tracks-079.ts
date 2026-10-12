/**
 * One-off backfill of `track` after migration 079 (B2 plan, decision D2).
 *
 * The slug → track table below is the appendix of
 * docs/plans/2026-10-10-b2-tracks-vault-inclusion.md as approved by Ryan.
 * Only rows whose track IS NULL are written, so an admin's choice is never
 * overwritten and re-running is harmless.
 *
 * Dry run (default — prints what would change):
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-tracks-079.ts --project-ref <ref>
 * Write:
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-tracks-079.ts --project-ref <ref> --apply
 *
 * --project-ref must match the Supabase URL in the environment; it makes the
 * target explicit on the command line.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isTrackId, type TrackId } from '../lib/tracks';

const ITEM_TRACKS: Record<string, TrackId> = {
  'advanced-system-prompts-claude': 'ai_essentials',
  'ai-content-creation-social-media': 'marketing_growth',
  'ai-ethics-every-professional': 'ai_essentials',
  'ai-japanese-workplace-trends-2026': 'research_insights',
  'ai-meeting-notes-template-japanese': 'workflow_automation',
  'ai-project-brief-template': 'build_with_ai',
  'automate-content-calendar-ai': 'marketing_growth',
  'building-personal-ai-workflow': 'workflow_automation',
  'chain-of-thought-prompting-guide': 'ai_essentials',
  'chatgpt-business-email-japanese': 'workflow_automation',
  'chatgpt-claude-gemini-comparison': 'ai_essentials',
  'claude-ai-complete-overview': 'ai_essentials',
  'cohort1-session-ai-workflows': 'workflow_automation',
  'cohort1-session-prompt-fundamentals': 'ai_essentials',
  'cohort2-session-advanced-claude': 'ai_essentials',
  'cohort2-session-ai-content-creators': 'marketing_growth',
  'cursor-ai-code-editor-guide': 'build_with_ai',
  'notebooklm-deep-dive': 'research_insights',
  'notebooklm-research-guide': 'research_insights',
  'perplexity-deep-research': 'research_insights',
  'prompt-engineering-mindset': 'ai_essentials',
  'prompt-starter-kit': 'ai_essentials',
  'weekly-ai-experiment-log': 'ai_essentials',
  'what-is-prompt-engineering': 'ai_essentials',
  'why-japanese-professionals-adopting-ai': 'research_insights',
  'zapier-ai-actions-overview': 'workflow_automation',
  'zapier-automation-japanese-business': 'workflow_automation',
};

const COURSE_TRACKS: Record<string, TrackId> = {
  'ai-essentials-first-steps-future': 'ai_essentials',
  'ai-for-music-professionals': 'marketing_growth',
  'teaching-ai-for-teachers': 'ai_essentials',
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function backfill(
  client: SupabaseClient,
  table: 'content_items' | 'courses',
  map: Record<string, TrackId>,
  apply: boolean,
) {
  const slugs = Object.keys(map);
  const { data, error } = await client.from(table).select('id, slug, track').in('slug', slugs);
  if (error) throw new Error(`${table}: ${error.message}`);
  const rows = (data ?? []) as { id: string; slug: string; track: string | null }[];

  const found = new Set(rows.map((r) => r.slug));
  const missing = slugs.filter((s) => !found.has(s));
  const keep = rows.filter((r) => r.track !== null);
  const todo = rows.filter((r) => r.track === null);

  console.log(`\n${table}: ${todo.length} to set, ${keep.length} already set (left alone), ${missing.length} slug(s) not found`);
  for (const r of keep) console.log(`  keep  ${r.slug} = ${r.track}`);
  for (const s of missing) console.log(`  MISSING ${s}`);

  const counts: Record<string, number> = {};
  for (const r of todo) {
    const track = map[r.slug];
    counts[track] = (counts[track] ?? 0) + 1;
    console.log(`  ${apply ? 'set ' : 'would set'} ${r.slug} → ${track}`);
    if (!apply) continue;
    const { error: upErr } = await client
      .from(table)
      .update({ track })
      .eq('id', r.id)
      .is('track', null);
    if (upErr) throw new Error(`${table} ${r.slug}: ${upErr.message}`);
  }
  console.log(`  per track: ${JSON.stringify(counts)}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ref = arg('--project-ref');
  const apply = process.argv.includes('--apply');
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  if (!ref) throw new Error('Pass --project-ref <ref> to name the target explicitly');
  if (new URL(url).hostname !== `${ref}.supabase.co`) {
    throw new Error(`--project-ref ${ref} does not match the environment's Supabase URL`);
  }
  for (const t of [...Object.values(ITEM_TRACKS), ...Object.values(COURSE_TRACKS)]) {
    if (!isTrackId(t)) throw new Error(`Bad track in table: ${t}`);
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`${apply ? 'APPLYING' : 'DRY RUN'} on ${ref}`);
  await backfill(client, 'content_items', ITEM_TRACKS, apply);
  await backfill(client, 'courses', COURSE_TRACKS, apply);
  if (!apply) console.log('\nDry run only. Re-run with --apply to write.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
