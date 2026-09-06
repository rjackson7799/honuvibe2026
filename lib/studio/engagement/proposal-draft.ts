// C3 · Proposal drafting orchestrator — called SYNCHRONOUSLY by
// POST /api/admin/engagements/[id]/proposal/[proposalId]/draft (the tailor
// route's shape). The route claims the run first (drafting_status =
// 'generating' + run id + input version, conditionally on status='draft' and
// no live run), then calls runProposalDraft, which ALWAYS finalizes through
// the CAS RPC (run id + input version) before the route responds. A request
// that dies mid-call leaves 'generating'; flipStaleProposalDrafts (>5 min,
// the flipStaleTailoring mould with a proposal_ai_failed event) turns it into
// failed/timeout with a Re-draft button.
//
// Only the five AI keys reach the RPC; it merges by key, so titles, order,
// `terms` and `next_steps` survive. Raw provider text goes to logs only;
// curated codes reach the DB.

import type { SupabaseClient } from '@supabase/supabase-js';
import { answerSnapshotSchema } from './questions-schema';
import { buildBudgetedContext } from './context-budget';
import {
  ENGAGEMENT_MODEL_ID,
  PROPOSAL_PIPELINE_VERSION,
  ProposalDraftError,
  buildSha,
  containsCjk,
  containsInvestmentFigure,
  curatedErrorCode,
  draftProposalSections,
  renderOfferTable,
} from './generator';
import { loadLeadContext } from './lead-context';
import type { Engagement, EngagementBrief, EngagementProposal, EngagementQuestionnaire } from '@/lib/admin/types';

/** > the call's ~90s timeout + headroom, so a live run is never flipped under itself. */
export const PROPOSAL_DRAFT_STALE_MINUTES = 5;

export type ProposalDraftErrorCode =
  | 'timeout'
  | 'provider_error'
  | 'malformed_output'
  | 'emitted_price'
  | 'stale_input'
  | 'missing_key'
  | 'internal';

export type ProposalDraftResult =
  | { ok: true; languageLooksRight: boolean; confidenceNote: string }
  | { ok: false; code: ProposalDraftErrorCode };

export function curatedProposalErrorCode(err: unknown): ProposalDraftErrorCode {
  if (err instanceof ProposalDraftError) return err.code;
  return curatedErrorCode(err);
}

/**
 * Demote zombie 'generating' runs to failed/timeout after
 * PROPOSAL_DRAFT_STALE_MINUTES. Fenced on the status + anchor; writes the
 * proposal_ai_failed event itself (a direct flip bypasses the RPC), so a
 * zombie reaches the attention list.
 */
export async function flipStaleProposalDrafts(admin: SupabaseClient, engagementId: string): Promise<void> {
  const cutoff = new Date(Date.now() - PROPOSAL_DRAFT_STALE_MINUTES * 60_000).toISOString();
  const { data, error } = await admin
    .from('engagement_proposals')
    .update({ drafting_status: 'failed', drafting_error: 'timeout' })
    .eq('engagement_id', engagementId)
    .eq('drafting_status', 'generating')
    .lt('drafting_started_at', cutoff)
    .select('id, version');
  if (error) {
    console.error(`[engagement/proposal] flipStaleProposalDrafts error for ${engagementId}:`, error.message);
    return;
  }
  for (const row of (data ?? []) as { id: string; version: number }[]) {
    const { error: evErr } = await admin.from('engagement_events').insert({
      engagement_id: engagementId,
      kind: 'proposal_ai_failed',
      actor: 'system',
      summary: `AI draft of proposal v${row.version} timed out — re-draft from the proposal panel`,
      data: { proposal_id: row.id, version: row.version, drafting_error: 'timeout' },
      needs_attention: true,
    });
    if (evErr) console.error(`[engagement/proposal] proposal_ai_failed event for ${row.id}:`, evErr.message);
  }
}

async function finalize(
  admin: SupabaseClient,
  proposal: EngagementProposal,
  args: Record<string, unknown>,
): Promise<{ applied: boolean; status?: string; error?: string }> {
  const { data, error } = await admin.rpc('finalize_engagement_proposal_draft', {
    p_proposal_id: proposal.id,
    p_run_id: proposal.drafting_run_id,
    ...args,
  });
  if (error) {
    console.error(`[engagement/proposal] finalize error for ${proposal.id}:`, error.message);
    return { applied: false, error: error.message };
  }
  const r = (data ?? {}) as { applied?: boolean; status?: string };
  return { applied: r.applied === true, status: r.status };
}

async function finalizeFailed(admin: SupabaseClient, proposal: EngagementProposal, code: ProposalDraftErrorCode): Promise<void> {
  await finalize(admin, proposal, {
    p_status: 'failed',
    p_model_id: ENGAGEMENT_MODEL_ID,
    p_pipeline_version: PROPOSAL_PIPELINE_VERSION,
    p_drafting_error: code,
  });
}

interface Structured {
  one_liner?: string;
  exec_summary_md?: string;
  working_md?: string;
  not_working_md?: string;
  opportunities_md?: string;
  questions_for_call?: string[];
}

function renderStructuredBrief(structured: Structured): string {
  return [
    structured.one_liner ? `**${structured.one_liner}**` : null,
    structured.exec_summary_md ? `## Executive summary\n${structured.exec_summary_md}` : null,
    structured.working_md ? `## What's working\n${structured.working_md}` : null,
    structured.not_working_md ? `## What's not working\n${structured.not_working_md}` : null,
    structured.opportunities_md ? `## Opportunities\n${structured.opportunities_md}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Run one drafting pass for a CLAIMED proposal (drafting_status must already
 * be 'generating' with its run id). Never throws: every outcome is finalized
 * through the RPC and reported as a result the route maps to a status code.
 */
export async function runProposalDraft(
  admin: SupabaseClient,
  proposal: EngagementProposal,
  engagement: Engagement,
): Promise<ProposalDraftResult> {
  const t0 = Date.now();
  try {
    if (!proposal.brief_id) {
      await finalizeFailed(admin, proposal, 'internal');
      return { ok: false, code: 'internal' };
    }
    const { data: bRow } = await admin.from('engagement_briefs').select('*').eq('id', proposal.brief_id).maybeSingle();
    const brief = (bRow ?? null) as EngagementBrief | null;
    if (!brief || (brief.status !== 'completed' && brief.status !== 'partial')) {
      await finalizeFailed(admin, proposal, 'internal');
      return { ok: false, code: 'internal' };
    }
    const { data: qRow } = brief.questionnaire_id
      ? await admin.from('engagement_questionnaires').select('*').eq('id', brief.questionnaire_id).maybeSingle()
      : { data: null };
    const questionnaire = (qRow ?? null) as EngagementQuestionnaire | null;

    const lead = await loadLeadContext(admin, engagement.lead_id, engagement.title);

    // The client answers, budgeted exactly as the brief was (C2).
    let answersBlock = '(no questionnaire answers available)';
    let truncated = null as ReturnType<typeof buildBudgetedContext>['truncated'];
    let auditSummary: string | null = lead.auditSummary;
    const snapshot = questionnaire?.answer_snapshot ? answerSnapshotSchema.safeParse(questionnaire.answer_snapshot) : null;
    if (snapshot?.success) {
      const budgeted = buildBudgetedContext({ auditSummary: lead.auditSummary, snapshot: snapshot.data });
      answersBlock = budgeted.answers_block;
      truncated = budgeted.truncated;
      auditSummary = budgeted.audit_summary;
    }

    const briefKind = brief.status === 'completed' && brief.structured ? 'completed' : 'partial';
    const briefBlock =
      briefKind === 'completed'
        ? renderStructuredBrief(brief.structured as Structured)
        : brief.digest_md ?? brief.brief_md ?? '(no brief content)';

    const generated = await draftProposalSections({
      locale: proposal.locale,
      lead,
      auditSummary,
      briefBlock,
      briefKind,
      answersBlock,
      offerTable: renderOfferTable(proposal.pricing, proposal.pricing_mode, proposal.performance_terms, proposal.data_basis),
      dataBasis: proposal.data_basis,
      truncated,
    });

    const aiSections = {
      exec_summary: generated.exec_summary_md.trim(),
      takeaways: generated.takeaways_md.trim(),
      recommendation: generated.recommendation_md.trim(),
      scope: generated.scope_md.trim(),
      investment_notes: generated.investment_notes_md.trim(),
    };

    const hit = containsInvestmentFigure(aiSections, proposal.pricing);
    if (hit) {
      throw new ProposalDraftError(`engagement/proposal: the draft carried an offer amount in ${hit.section} ("${hit.match}")`);
    }

    const sourceSnapshot = {
      brief_id: brief.id,
      brief_status: brief.status,
      questionnaire_id: questionnaire?.id ?? null,
      questions_version: snapshot?.success ? snapshot.data.questions_version : null,
      audit_used: auditSummary !== null,
      audited_url: lead.auditedUrl,
      truncated,
      confidence_note: generated.confidence_note.trim(),
      pipeline_version: PROPOSAL_PIPELINE_VERSION,
      build_sha: buildSha(),
      drafted_at: new Date().toISOString(),
    };

    const result = await finalize(admin, proposal, {
      p_status: 'completed',
      p_ai_sections: aiSections,
      p_source_snapshot: sourceSnapshot,
      p_model_id: ENGAGEMENT_MODEL_ID,
      p_pipeline_version: PROPOSAL_PIPELINE_VERSION,
    });
    if (result.error) {
      // proposal_not_draft (the row left `draft` mid-call: withdrawn, marked
      // ready, or swept by Lost) or a transient DB error. Either way the
      // completed write did not happen, so RELEASE THE CLAIM through the
      // RPC's failed branch (no status precondition) — otherwise the row sits
      // at `generating` until the stale flip and the one-drafting index blocks
      // the next version's draft for five minutes.
      const code: ProposalDraftErrorCode = result.error.includes('proposal_not_draft') ? 'stale_input' : 'internal';
      await finalizeFailed(admin, proposal, code);
      return { ok: false, code };
    }
    if (!result.applied) {
      // A stale flip terminalized this run while it was in flight — nothing was written.
      return { ok: false, code: 'timeout' };
    }
    if (result.status === 'failed') {
      // The RPC recorded stale_input: the proposal changed while the model ran.
      return { ok: false, code: 'stale_input' };
    }

    const languageLooksRight = proposal.locale === 'ja' ? containsCjk(Object.values(aiSections).join(' ')) : true;
    console.log(`[engagement/proposal] drafted proposal=${proposal.id} v${proposal.version} ms=${Date.now() - t0}`);
    return { ok: true, languageLooksRight, confidenceNote: generated.confidence_note.trim() };
  } catch (err) {
    console.error(`[engagement/proposal] draft failed for ${proposal.id}:`, err); // raw → logs only
    const code = curatedProposalErrorCode(err);
    await finalizeFailed(admin, proposal, code);
    return { ok: false, code };
  }
}
