// C1 · Tailoring orchestrator — called SYNCHRONOUSLY by
// POST /api/admin/engagements/[id]/questionnaire/tailor (one call, one admin;
// the audit's poll machinery exists for a 1.5–3 min crawl chain — this is the
// shape of blue-filler/generate). The route claims the run first
// (tailoring_status='generating' + tailoring_started_at, the partial unique
// index turning a double-click into 23505 → 409), then calls runTailoring,
// which ALWAYS finalizes through the CAS RPC before the route responds —
// completed replaces the manifest, bumps questions_version and clears every
// draft answer in one transaction; failed writes a curated error code. A
// request that dies mid-call leaves 'generating', and flipStaleTailoring (on
// the admin's next read of the workspace) flips it to failed/timeout.

import type { SupabaseClient } from '@supabase/supabase-js';
import { AUDIT_SUMMARY_MAX_CHARS, TRUNCATION_MARKER, neutralize } from './context-budget';
import {
  ENGAGEMENT_MODEL_ID,
  TAILOR_PIPELINE_VERSION,
  containsCjk,
  curatedErrorCode,
  tailorQuestionnaire,
} from './generator';
import { loadLeadContext } from './lead-context';
import { mergeTailoredQuestionnaire } from './merge';
import type { Engagement, EngagementQuestionnaire } from '@/lib/admin/types';

/** > maxDuration(120s) with headroom, so a live call is never flipped under itself. */
export const TAILOR_STALE_MINUTES = 5;

export type TailoringErrorCode =
  | 'timeout'
  | 'provider_error'
  | 'malformed_output'
  | 'too_many_dropped'
  | 'missing_key'
  | 'internal';

export type TailorRunResult =
  | {
      ok: true;
      questionCount: number;
      dropped: string[];
      added: string[];
      keptUnmentioned: string[];
      rationale: string;
      /** ja questionnaires only: false when the tailored output contains no CJK codepoints. */
      languageLooksRight: boolean;
    }
  | { ok: false; code: TailoringErrorCode };

/**
 * Demote zombie 'generating' tailoring runs (a request killed mid-call) to
 * failed/timeout after TAILOR_STALE_MINUTES. Fenced on the status + anchor,
 * so a live run is never touched; the CAS RPC makes a late completion a no-op.
 */
export async function flipStaleTailoring(admin: SupabaseClient, engagementId: string): Promise<void> {
  const cutoff = new Date(Date.now() - TAILOR_STALE_MINUTES * 60_000).toISOString();
  const { error } = await admin
    .from('engagement_questionnaires')
    .update({ tailoring_status: 'failed', tailoring_error: 'timeout' })
    .eq('engagement_id', engagementId)
    .eq('tailoring_status', 'generating')
    .lt('tailoring_started_at', cutoff);
  if (error) console.error(`[engagement/tailor] flipStaleTailoring error for ${engagementId}:`, error.message);
}

async function finalizeFailed(admin: SupabaseClient, questionnaireId: string, code: TailoringErrorCode): Promise<void> {
  const { error } = await admin.rpc('finalize_engagement_questionnaire_tailoring', {
    p_questionnaire_id: questionnaireId,
    p_status: 'failed',
    p_model_id: ENGAGEMENT_MODEL_ID,
    p_pipeline_version: TAILOR_PIPELINE_VERSION,
    p_tailoring_error: code,
  });
  if (error) console.error('[engagement/tailor] finalize(failed) error:', error.message);
}

/**
 * Run one tailoring pass for a CLAIMED questionnaire (tailoring_status must
 * already be 'generating'). Never throws: every outcome is finalized through
 * the RPC and reported as a result the route maps to a status code.
 */
export async function runTailoring(
  admin: SupabaseClient,
  questionnaire: EngagementQuestionnaire,
  engagement: Engagement,
): Promise<TailorRunResult> {
  const t0 = Date.now();
  try {
    const lead = await loadLeadContext(admin, engagement.lead_id, engagement.title);
    let auditSummary = lead.auditSummary ? neutralize(lead.auditSummary) : null;
    if (auditSummary && auditSummary.length > AUDIT_SUMMARY_MAX_CHARS) {
      auditSummary = `${auditSummary.slice(0, AUDIT_SUMMARY_MAX_CHARS - TRUNCATION_MARKER.length - 1).trimEnd()} ${TRUNCATION_MARKER}`;
    }

    const output = await tailorQuestionnaire({
      locale: questionnaire.locale,
      lead,
      auditSummary,
      sections: questionnaire.sections,
      questions: questionnaire.questions,
    });

    const merged = mergeTailoredQuestionnaire(
      { sections: questionnaire.sections, questions: questionnaire.questions },
      output,
    );
    if (!merged.ok) {
      console.error(`[engagement/tailor] merge rejected (${merged.error}): ${merged.detail}`);
      await finalizeFailed(admin, questionnaire.id, merged.error);
      return { ok: false, code: merged.error };
    }

    const { data, error } = await admin.rpc('finalize_engagement_questionnaire_tailoring', {
      p_questionnaire_id: questionnaire.id,
      p_status: 'completed',
      p_sections: merged.sections,
      p_questions: merged.questions,
      p_model_id: ENGAGEMENT_MODEL_ID,
      p_pipeline_version: TAILOR_PIPELINE_VERSION,
    });
    if (error) {
      // questionnaire_not_draft (someone sent it mid-call) or a transient DB
      // error. Either way the completed write did not happen, so release the
      // claim through the RPC's failed branch (it has no draft precondition) —
      // otherwise the row sits at 'generating' until the stale flip and Re-tailor
      // 409s "already running" for five minutes.
      console.error('[engagement/tailor] finalize(completed) error:', error.message);
      await finalizeFailed(admin, questionnaire.id, 'internal');
      return { ok: false, code: 'internal' };
    }
    const applied = (data as { applied?: boolean } | null)?.applied === true;
    if (!applied) {
      // A stale flip terminalized this run while it was in flight — nothing was written.
      return { ok: false, code: 'timeout' };
    }

    const sampleText = [
      ...merged.sections.map((s) => `${s.title} ${s.blurb ?? ''}`),
      ...merged.questions.map((q) => `${q.prompt} ${q.help ?? ''} ${q.options.map((o) => o.label).join(' ')}`),
    ].join(' ');
    const languageLooksRight = questionnaire.locale === 'ja' ? containsCjk(sampleText) : true;

    console.log(`[engagement/tailor] completed questionnaire=${questionnaire.id} questions=${merged.questions.length} ms=${Date.now() - t0}`);
    return {
      ok: true,
      questionCount: merged.questions.length,
      dropped: merged.dropped,
      added: merged.added,
      keptUnmentioned: merged.kept_unmentioned,
      rationale: output.rationale,
      languageLooksRight,
    };
  } catch (err) {
    console.error(`[engagement/tailor] run failed for ${questionnaire.id}:`, err); // raw → logs only
    const code = curatedErrorCode(err);
    await finalizeFailed(admin, questionnaire.id, code);
    return { ok: false, code };
  }
}
