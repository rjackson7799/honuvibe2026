// C2 · Discovery brief — the after() orchestrator + its stale flip. A
// near-literal fork of lib/studio/audit/run.ts's discipline: every
// state-changing write is error-checked AND fenced on status='generating'
// (a stale flip that terminalizes the row mid-run can never be overwritten by
// a slow worker), safe error CODES reach the DB, raw exceptions go only to logs.
//
// Two-phase, which is what makes `partial` meaningful:
//   phase 1  digest_md — deterministic, rendered in code from the UNTRUNCATED
//            pinned snapshot, written immediately with a fenced UPDATE. Cannot
//            fail for model reasons; `failed` (digest_failed) means the
//            snapshot itself was malformed.
//   phase 2  the narrative — buildBudgetedContext → Claude → brief_md +
//            structured. Provider failure ⇒ `partial` (digest present,
//            narrative null, curated generation_error), so Ryan always has a
//            readable answers document within a second of submission and the
//            AI layer is genuinely optional.
// The brief claim row is inserted by submit_engagement_questionnaire (or the
// regenerate route); this runner only ever finalizes an existing claim.

import type { SupabaseClient } from '@supabase/supabase-js';
import { answerSnapshotSchema } from './questions-schema';
import { buildBudgetedContext } from './context-budget';
import { buildDigestMd } from './digest';
import {
  BRIEF_PIPELINE_VERSION,
  ENGAGEMENT_MODEL_ID,
  assembleBriefMd,
  buildSha,
  curatedErrorCode,
  generateBrief,
} from './generator';
import { loadLeadContext } from './lead-context';
import type { Engagement, EngagementBrief, EngagementQuestionnaire } from '@/lib/admin/types';

/** > the brief's ~90s call + headroom, so a live worker isn't flipped. */
export const BRIEF_STALE_MINUTES = 7;

/**
 * Demote zombie `generating` briefs (crashed / killed after() invocations) to
 * `failed` after BRIEF_STALE_MINUTES. Called by the GET poll before reading
 * and by the regenerate POST before inserting. Fenced on status='generating'.
 * Direct UPDATE (not the RPC) on purpose, exactly like flipStaleAudits — the
 * CAS in finalize_engagement_brief makes a late worker write a no-op.
 */
export async function flipStaleBriefs(admin: SupabaseClient, engagementId: string): Promise<void> {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - BRIEF_STALE_MINUTES * 60_000).toISOString();
  const { data, error } = await admin
    .from('engagement_briefs')
    .update({ status: 'failed', generation_error: 'timeout', completed_at: now, updated_at: now })
    .eq('engagement_id', engagementId)
    .eq('status', 'generating')
    .lt('created_at', cutoff)
    .select('id');
  if (error) {
    console.error(`[engagement/brief] flipStaleBriefs error for ${engagementId}:`, error.message);
    return;
  }
  // The finalize RPC writes brief_failed itself; a direct flip must too, or a
  // zombie brief never reaches the attention list.
  for (const row of (data ?? []) as { id: string }[]) {
    const { error: evErr } = await admin.from('engagement_events').insert({
      engagement_id: engagementId,
      kind: 'brief_failed',
      actor: 'system',
      summary: 'Discovery brief generation timed out — regenerate from the brief panel',
      data: { brief_id: row.id, status: 'failed', generation_error: 'timeout' },
      needs_attention: true,
    });
    if (evErr) console.error(`[engagement/brief] brief_failed event for ${row.id}:`, evErr.message);
  }
}

type FenceResult = 'error' | 'fenced' | 'applied';

/** Phase 1's fenced write: digest_md lands only while the row is still generating. */
async function writeDigest(admin: SupabaseClient, briefId: string, digestMd: string): Promise<FenceResult> {
  const { data, error } = await admin
    .from('engagement_briefs')
    .update({ digest_md: digestMd, updated_at: new Date().toISOString() })
    .eq('id', briefId)
    .eq('status', 'generating')
    .select('id');
  if (error) {
    console.error(`[engagement/brief] digest write error for ${briefId}:`, error.message);
    return 'error';
  }
  return (data?.length ?? 0) === 0 ? 'fenced' : 'applied';
}

async function finalize(
  admin: SupabaseClient,
  briefId: string,
  args: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await admin.rpc('finalize_engagement_brief', { p_brief_id: briefId, ...args });
  if (error) {
    console.error(`[engagement/brief] finalize error for ${briefId}:`, error.message);
    return false;
  }
  return (data as { applied?: boolean } | null)?.applied === true;
}

function log(briefId: string, stage: string, t0: number): void {
  console.log(`[engagement/brief] ${stage} brief=${briefId} ms=${Date.now() - t0}`);
}

/**
 * Generate one CLAIMED brief. Loads everything it needs by id so it is safe to
 * run inside after() with nothing but the brief id.
 */
export async function runBrief(admin: SupabaseClient, briefId: string): Promise<void> {
  const t0 = Date.now();
  try {
    const { data: briefRow, error: briefErr } = await admin.from('engagement_briefs').select('*').eq('id', briefId).maybeSingle();
    if (briefErr || !briefRow) {
      console.error(`[engagement/brief] brief ${briefId} not found:`, briefErr?.message);
      return;
    }
    const brief = briefRow as unknown as EngagementBrief;
    if (brief.status !== 'generating') return; // already terminal (stale flip / replay)
    if (!brief.questionnaire_id) {
      await finalize(admin, briefId, { p_status: 'failed', p_generation_error: 'digest_failed' });
      return;
    }

    const [{ data: qRow }, { data: eRow }] = await Promise.all([
      admin.from('engagement_questionnaires').select('*').eq('id', brief.questionnaire_id).maybeSingle(),
      admin.from('engagements').select('*').eq('id', brief.engagement_id).maybeSingle(),
    ]);
    const questionnaire = (qRow ?? null) as EngagementQuestionnaire | null;
    const engagement = (eRow ?? null) as Engagement | null;
    if (!questionnaire || !engagement) {
      await finalize(admin, briefId, { p_status: 'failed', p_generation_error: 'digest_failed' });
      return;
    }

    // Phase 1 — the digest from the UNTRUNCATED snapshot.
    const snapshot = answerSnapshotSchema.safeParse(questionnaire.answer_snapshot);
    if (!snapshot.success) {
      console.error(`[engagement/brief] malformed snapshot for ${briefId}:`, snapshot.error.issues.slice(0, 3));
      await finalize(admin, briefId, { p_status: 'failed', p_generation_error: 'digest_failed' });
      return;
    }
    let digestMd: string;
    try {
      digestMd = buildDigestMd(snapshot.data);
    } catch (err) {
      console.error(`[engagement/brief] digest render failed for ${briefId}:`, err);
      await finalize(admin, briefId, { p_status: 'failed', p_generation_error: 'digest_failed' });
      return;
    }
    const wrote = await writeDigest(admin, briefId, digestMd);
    if (wrote !== 'applied') {
      log(briefId, `digest ${wrote}`, t0);
      return; // fenced: a stale flip already terminalized this run
    }

    // Phase 2 — the narrative, from the budgeted context.
    const lead = await loadLeadContext(admin, engagement.lead_id, engagement.title);
    const budgeted = buildBudgetedContext({ auditSummary: lead.auditSummary, snapshot: snapshot.data });
    const sourceSnapshot = {
      questionnaire_id: questionnaire.id,
      questions_version: snapshot.data.questions_version,
      locale: snapshot.data.locale,
      question_count: budgeted.question_count,
      answered_count: budgeted.answered_count,
      audit_used: budgeted.audit_summary !== null,
      audited_url: lead.auditedUrl,
      truncated: budgeted.truncated,
      pipeline_version: BRIEF_PIPELINE_VERSION,
    };

    try {
      const generated = await generateBrief({
        locale: snapshot.data.locale,
        lead,
        auditSummary: budgeted.audit_summary,
        answersBlock: budgeted.answers_block,
        truncated: budgeted.truncated,
        questionCount: budgeted.question_count,
        answeredCount: budgeted.answered_count,
      });
      const applied = await finalize(admin, briefId, {
        p_status: 'completed',
        p_digest_md: digestMd,
        p_brief_md: assembleBriefMd(engagement.title, generated),
        p_structured: generated,
        p_source_snapshot: sourceSnapshot,
        p_model_id: ENGAGEMENT_MODEL_ID,
        p_pipeline_version: BRIEF_PIPELINE_VERSION,
        p_build_sha: buildSha(),
      });
      log(briefId, applied ? 'completed' : 'completed (not applied — already terminal)', t0);
    } catch (err) {
      console.error(`[engagement/brief] narrative failed for ${briefId}:`, err); // raw → logs only
      const code = curatedErrorCode(err);
      await finalize(admin, briefId, {
        p_status: 'partial',
        p_digest_md: digestMd,
        p_source_snapshot: sourceSnapshot,
        p_generation_error: code,
        p_model_id: ENGAGEMENT_MODEL_ID,
        p_pipeline_version: BRIEF_PIPELINE_VERSION,
        p_build_sha: buildSha(),
      });
      log(briefId, `partial (${code})`, t0);
    }
  } catch (err) {
    console.error(`[engagement/brief] run failed for ${briefId}:`, err);
    await finalize(admin, briefId, { p_status: 'failed', p_generation_error: 'internal' });
  }
}
