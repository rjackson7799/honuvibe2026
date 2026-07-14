import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreProspectWebsite, SCORE_FAILED } from './score';

// The after() batch orchestrator for prospect scoring (Studio, phase 4).
// Adapted from lib/studio/audit/run.ts's one-row fence to a batch: each claimed
// row is scored under a bounded promise pool, and every score write is a
// COMPARE-AND-SWAP fenced on BOTH status='scoring' AND the website snapshot the
// row was claimed with. The website term is the refresh-race fix: if an
// overlapping search re-upserted a different website mid-flight, this worker's
// result describes the OLD site and must not land — the CAS makes it a logged
// no-op, the row stays 'scoring' on the new data, and the 5-min staleness flip
// + next search re-score it. A convert set mid-scoring is fenced by the status
// term. Scoring context lives in this closure by design (accepted limitation):
// a killed invocation abandons the batch and the staleness flip turns orphaned
// 'scoring' rows into score_failed.

export interface ClaimedProspect {
  id: string;
  website: string | null;
}

const SCORE_CONCURRENCY = 4;

// > the worker budget (maxDuration 300s), same invariant as the audit engine's
// STALE_MINUTES = 7: safe-fetch's 8s cap does not bound dns.lookup, so a batch
// of dead legacy domains can legitimately run near the full budget — a live
// worker must never be flipped out from under itself by a concurrent read.
const STALE_SCORING_MINUTES = 7;

/**
 * Demote zombie 'scoring' rows (died after() invocations) to score_failed.
 * Called by the search route before claiming and by the list GET before
 * reading (no cron). A flip racing a live worker is harmless either way — the
 * worker's CAS fence turns its late write into a logged no-op.
 * (scoring_started_at IS NULL cannot occur — prospects_scoring_needs_anchor_ck.)
 */
export async function flipStaleScoring(admin: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_SCORING_MINUTES * 60_000).toISOString();
  const { error } = await admin
    .from('prospects')
    .update({
      status: 'score_failed',
      score: SCORE_FAILED,
      score_breakdown: null,
      tech: null,
      scored_at: new Date().toISOString(),
    })
    .eq('status', 'scoring')
    .lt('scoring_started_at', cutoff);
  if (error) console.error('[studio/prospects] stale flip failed:', error);
}

// Bounded-concurrency map (same shape as lib/studio/audit/crawl.ts's mapPool).
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runner = async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

export async function scoreProspects(
  admin: SupabaseClient,
  claimed: ClaimedProspect[],
  currentYear: number,
): Promise<void> {
  const t0 = Date.now();
  let scored = 0;
  let failed = 0;
  let fenced = 0;

  await mapPool(claimed, SCORE_CONCURRENCY, async (row) => {
    try {
      const result = await scoreProspectWebsite(row.website, currentYear);

      let query = admin
        .from('prospects')
        .update({
          status: result.status,
          score: result.score,
          score_breakdown: result.breakdown,
          tech: result.tech,
          scored_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('status', 'scoring');
      // CAS on the claimed website snapshot (.is for a null snapshot — .eq
      // builds `=NULL`, which matches nothing in PostgREST).
      query =
        row.website === null ? query.is('website', null) : query.eq('website', row.website);

      const { data, error } = await query.select('id');
      if (error) {
        console.error(`[studio/prospects] score write error for ${row.id}:`, error);
        failed += 1;
        return;
      }
      if ((data?.length ?? 0) === 0) {
        // Mid-flight refresh or convert — discard this result, no retry-write.
        fenced += 1;
        return;
      }
      if (result.status === 'score_failed') failed += 1;
      else scored += 1;
    } catch (err) {
      // scoreProspectWebsite never throws, so this is a write-path surprise.
      console.error(`[studio/prospects] scoring ${row.id} failed:`, err);
      failed += 1;
    }
  });

  console.log(
    `[studio/prospects] scored=${scored} failed=${failed} fenced=${fenced} ms=${Date.now() - t0}`,
  );
}
