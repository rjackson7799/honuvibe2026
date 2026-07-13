import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAuditPages } from './crawl';
import { computeHeuristics } from './heuristics';
import { fetchPsiWithRetry } from './psi';
import { generateAuditNarrative, AUDIT_MODEL_ID } from './generator';
import { buildSummaryMd } from './summary';
import type {
  AuditFinding,
  AuditPsi,
  AuditScores,
  AuditTech,
  GeneratedAuditNarrative,
} from './schemas';

// The after() orchestrator + its fence helpers. This is first-of-a-kind for the
// repo (the tutoring after() job ignores its DB .error and uses unconditional
// .eq('id') writes): EVERY state-changing write here is error-checked AND fenced
// on status='generating', so a stale-flip that terminalizes the row mid-run can
// never be overwritten by a slow worker. Safe error CODES reach the DB; raw
// exceptions go only to server logs.

export interface AuditLeadContext {
  leadId: string;
  company: string;
  industry: string | null;
  url: string;
}

type FenceResult = 'error' | 'fenced' | 'applied';

const STALE_MINUTES = 7; // > maxDuration(300s) + crawl deadline, so a live worker isn't flipped

function currentYear(): number {
  return new Date().getFullYear();
}

function logAudit(auditId: string, stage: string, result: string, t0: number): void {
  console.log(`[studio/audit] ${stage} audit=${auditId} result=${result} ms=${Date.now() - t0}`);
}

/**
 * A state-changing write fenced on status='generating'. Returns 'error' (DB
 * error — logged, caller aborts), 'fenced' (0 rows matched — a stale-flip
 * already terminalized this run; do nothing), or 'applied'. Mirrors
 * lib/survey/send-presenter-summary.ts's claim-then-check-rowcount pattern.
 */
async function fencedUpdate(
  admin: SupabaseClient,
  auditId: string,
  patch: Record<string, unknown>,
): Promise<FenceResult> {
  const { data, error } = await admin
    .from('lead_audits')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', auditId)
    .eq('status', 'generating')
    .select('id');
  if (error) {
    console.error(`[studio/audit] fenced write error for ${auditId}:`, error);
    return 'error';
  }
  return (data?.length ?? 0) === 0 ? 'fenced' : 'applied';
}

interface FinalizeFields {
  status: 'completed' | 'partial' | 'failed';
  scores?: AuditScores;
  findings?: AuditFinding[];
  tech?: AuditTech;
  psi?: AuditPsi | null;
  narrative?: GeneratedAuditNarrative;
  summary_md?: string;
  generation_error?: string;
}

/**
 * A terminal fencedUpdate that also stamps completed_at + model_id. Because it is
 * fenced, a late failed/timeout write AFTER a stale-flip is a harmless no-op — it
 * never resurrects a terminalized row. The 060 CHECK constraint backstops the
 * terminal payload shape, so an incomplete write is rejected by the DB, not stored.
 */
async function finalize(
  admin: SupabaseClient,
  auditId: string,
  fields: FinalizeFields,
): Promise<FenceResult> {
  return fencedUpdate(admin, auditId, {
    ...fields,
    model_id: AUDIT_MODEL_ID,
    completed_at: new Date().toISOString(),
  });
}

/**
 * Demote zombie `generating` rows (crashed/killed after() invocations) to
 * `failed` after STALE_MINUTES. Called by the GET route before reading and by
 * the POST route before inserting. Fenced on status='generating'; the fence in
 * runAudit makes an overlap with a still-running worker harmless either way.
 */
export async function flipStaleAudits(admin: SupabaseClient, leadId: string): Promise<void> {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  const { error } = await admin
    .from('lead_audits')
    .update({
      status: 'failed',
      generation_error: 'timeout',
      completed_at: now,
      updated_at: now,
    })
    .eq('lead_id', leadId)
    .eq('status', 'generating')
    .lt('created_at', cutoff);
  if (error) console.error(`[studio/audit] flipStaleAudits error for lead ${leadId}:`, error);
}

export async function runAudit(
  admin: SupabaseClient,
  auditId: string,
  leadCtx: AuditLeadContext,
): Promise<void> {
  const t0 = Date.now();
  try {
    const pages = await fetchAuditPages(leadCtx.url);
    if (pages.length === 0) {
      const r = await finalize(admin, auditId, { status: 'failed', generation_error: 'unreachable' });
      logAudit(auditId, 'unreachable', r, t0);
      return;
    }

    const finalUrl = pages[0].finalUrl;
    const [heur, psi] = await Promise.all([
      Promise.resolve(computeHeuristics(pages, currentYear())),
      fetchPsiWithRetry(finalUrl), // the ACTUAL fetched URL (matches audited_url)
    ]);

    // Persist deterministic results FIRST (row still 'generating'), FENCED. If not
    // 'applied', a stale-flip already terminalized this run — abort before Claude.
    const persisted = await fencedUpdate(admin, auditId, {
      scores: heur.scores,
      findings: heur.findings,
      tech: heur.tech,
      psi,
      audited_url: finalUrl,
    });
    if (persisted !== 'applied') {
      logAudit(auditId, 'persist', persisted, t0);
      return;
    }

    try {
      const narrative = await generateAuditNarrative({
        company: leadCtx.company,
        industry: leadCtx.industry,
        auditedUrl: finalUrl,
        scores: heur.scores,
        findings: heur.findings,
        tech: heur.tech,
        psi,
      });
      const r = await finalize(admin, auditId, {
        status: 'completed',
        narrative,
        summary_md: buildSummaryMd(heur, psi, narrative),
      });
      logAudit(auditId, 'complete', r, t0);
    } catch (nErr) {
      console.error(`[studio/audit] narrative failed for ${auditId}:`, nErr); // raw → logs only
      const r = await finalize(admin, auditId, {
        status: 'partial',
        summary_md: buildSummaryMd(heur, psi, null),
        generation_error: 'narrative_failed', // SAFE code → DB
      });
      logAudit(auditId, 'partial', r, t0);
    }
  } catch (err) {
    console.error(`[studio/audit] run failed for ${auditId}:`, err);
    const code = err instanceof DOMException && err.name === 'TimeoutError' ? 'timeout' : 'internal';
    await finalize(admin, auditId, { status: 'failed', generation_error: code });
  }
}
