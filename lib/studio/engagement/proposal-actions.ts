'use server';

// Studio proposal — admin server actions (slice 3, migration 074). The
// questionnaire-actions.ts shape: requireAdmin(), zod parseInput, the
// service-role client, a local translateDbError mapping every RAISE name in
// 074 (+ 23505) to a sentence, revalidatePath on the engagement page, the
// list, AND the lead page whenever the stage may have moved.
//
//   create / save   the priced offer + the seven sections. USD offers are
//                   RE-RUN from `inputs` on the server and a payload whose
//                   base/rush/lines differ is rejected; JPY offers are
//                   rebuilt from their typed yen figures; ai_native from its
//                   typed parts. totalsOf is the one arithmetic. Saves carry
//                   content_version (optimistic concurrency); a save on
//                   `ready` returns the row to draft (the trigger requires it).
//   ready / back    the human-review gate carried by `status`. Mark ready is
//                   the moment Ryan confirms the narrative carries no price.
//   issue           THE FREEZE: buildIssuedSnapshot → render the PDF → upload
//                   to the private bucket → issue_engagement_proposal (CAS on
//                   content_version + engagement.updated_at) → on
//                   applied:false / throw, delete the uploaded object. Slice A
//                   ships 'manual' delivery; 'link' is slice B.
//   withdraw        frees the one-open slot; token revoked.
//   revise          copies content + brief_id + source_snapshot into
//                   create_engagement_proposal; supersedes only an open source.
//   mark accepted   accept_engagement_proposal(…, 'admin', null) on an ISSUED
//                   row, then Ryan's notification.
//   void            void_engagement_proposal_acceptance — clears the money,
//                   returns build → proposal, won_at retained (067's rule).
//
// Money never leaves totalsOf / lib/pricing.ts; the PDF is rendered from the
// snapshot only; the plaintext token never appears here (slice B mints it).

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateProposalPdf } from './generate-proposal-pdf';
import { notifyProposalAccepted } from './proposal-notify';
import {
  ENGAGEMENT_DOCUMENTS_BUCKET,
  buildIssuedSnapshot,
  buildProposalDocModel,
  hstDateOf,
  proposalPdfPath,
} from './proposal-document';
import {
  OfferError,
  buildCustomOffer,
  buildJpyOffer,
  buildUsdOffer,
  usdOfferMatchesCalculator,
  type PricedOffer,
} from './proposal-pricing';
import { acceptedByNameSchema, proposalInputSchema, voidReasonSchema, type ProposalInput } from './proposal-schema';
import { seedSections } from './proposal-terms';
import { PROPOSAL_REQUIRED_SECTION_KEYS, type EngagementEventKind } from './types';
import type { Engagement, EngagementProposal } from '@/lib/admin/types';

const VALIDITY_DAYS = 30;

// ── Auth + parse helpers (the questionnaire-actions idiom) ──────────────────

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Not authorized');
}

function parseInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const messages = result.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    );
    throw new Error(`Invalid input — ${messages.join(' ')}`);
  }
  return result.data;
}

const uuidSchema = z.string().uuid();
const contentVersionSchema = z.number().int().min(1);

function revalidate(engagementId: string, leadId?: string | null): void {
  revalidatePath(`/admin/studio/engagements/${engagementId}`);
  revalidatePath('/admin/studio/engagements');
  if (leadId) {
    revalidatePath(`/admin/studio/leads/${leadId}`);
    revalidatePath('/admin/studio/leads');
  }
}

async function loadProposal(admin: SupabaseClient, proposalId: string): Promise<EngagementProposal> {
  const { data, error } = await admin.from('engagement_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (error) {
    console.error('[proposal] load failed:', error);
    throw new Error('Failed to load the proposal.');
  }
  if (!data) throw new Error('Proposal not found.');
  return data as unknown as EngagementProposal;
}

async function loadEngagement(admin: SupabaseClient, engagementId: string): Promise<Engagement> {
  const { data, error } = await admin.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (error) {
    console.error('[proposal] engagement load failed:', error);
    throw new Error('Failed to load the engagement.');
  }
  if (!data) throw new Error('Engagement not found.');
  return data as unknown as Engagement;
}

async function logEvent(
  admin: SupabaseClient,
  engagementId: string,
  kind: EngagementEventKind,
  summary: string,
  data: Record<string, unknown> = {},
  actor: 'admin' | 'client' | 'system' = 'admin',
  needsAttention = false,
): Promise<void> {
  const { error } = await admin
    .from('engagement_events')
    .insert({ engagement_id: engagementId, kind, actor, summary, data, needs_attention: needsAttention });
  if (error) console.error(`[proposal] event ${kind} failed:`, error);
}

/** Every RAISE name in 074 (+ 23505 / 23514) → an operator-readable sentence. */
function translateDbError(error: { message?: string; code?: string }, fallback: string): Error {
  const m = error.message ?? '';
  const table: [string, string][] = [
    ['engagement_terminal', 'This engagement is closed — reopen it before proposing.'],
    ['proposal_already_accepted', 'An accepted proposal already exists — void its acceptance first.'],
    ['discovery_not_submitted', 'Send the discovery questionnaire and wait for the submission before proposing.'],
    ['brief_missing', 'Generate the discovery brief before proposing.'],
    ['brief_stale', 'The brief predates the current submission — regenerate it before proposing.'],
    ['proposal_not_open', 'That proposal is no longer open, so it cannot be superseded.'],
    ['proposal_transition_invalid', "That change is not allowed from the proposal's current status."],
    ['proposal_content_locked', 'This proposal has been issued — its content is frozen. Revise to create a new version.'],
    ['proposal_drafting_in_progress', 'AI is drafting — edits unlock when it finishes.'],
    ['proposal_ready_content_change', 'Saving returns this proposal to Draft — mark it ready again after.'],
    ['proposal_validity_shortened', 'The validity date can only be extended, never shortened.'],
    ['proposal_issued_fields_locked', 'The issued document cannot be changed.'],
    ['proposal_acceptance_locked', 'The recorded acceptance cannot be changed — void it instead.'],
    ['proposal_incomplete', 'Fill in the executive summary, recommendation, scope and terms before issuing.'],
    ['accepted_by_required', 'Enter the name of the person accepting (up to 200 characters).'],
    ['void_reason_required', 'A reason is required to void an acceptance.'],
    ['proposal_not_draft', 'Only a draft can receive an AI draft.'],
    ['proposal_not_found', 'Proposal not found.'],
    ['engagement_not_found', 'Engagement not found.'],
  ];
  for (const [needle, sentence] of table) {
    if (m.includes(needle)) return new Error(sentence);
  }
  if (error.code === '23505') return new Error('There is already an open proposal — revise it or withdraw it first.');
  if (error.code === '23514') {
    console.error('[proposal] check violation:', error);
    return new Error('The proposal failed a data check — reload and try again.');
  }
  console.error('[proposal]', fallback, error);
  return new Error(fallback);
}

// ── The offer, re-derived on the server ─────────────────────────────────────

/**
 * Never trust the payload's money: rebuild the offer from its own inputs with
 * the same pure constructors the form used, and compare. USD: the calculator
 * is authoritative (base/rush/lines must match; the adjustment is Ryan's).
 * JPY: the typed yen figures are rebuilt so the line structure must match the
 * calculator. ai_native: rebuilt from its typed parts. The result — not the
 * payload — is what gets stored.
 */
function canonicalOffer(offer: PricedOffer): PricedOffer {
  try {
    if (offer.tier === 'ai_native') {
      return buildCustomOffer(offer.currency, offer.base, offer.rush, offer.lines, offer.adjustment);
    }
    if (offer.currency === 'USD') {
      if (!usdOfferMatchesCalculator(offer)) {
        throw new OfferError('The USD offer does not match the calculator — reload the form and try again.');
      }
      return buildUsdOffer(offer.inputs, offer.adjustment);
    }
    const lines: Record<string, { build: number; monthly: number }> = {};
    for (const l of offer.lines) lines[l.id] = { build: l.build, monthly: l.monthly };
    return buildJpyOffer(offer.inputs, {
      base: { build: offer.base.build, monthly: offer.base.monthly },
      rush: offer.rush ? offer.rush.build : null,
      lines,
      adjustment: offer.adjustment,
    });
  } catch (err) {
    if (err instanceof OfferError) throw new Error(err.message);
    throw err;
  }
}

function contentPatch(input: ProposalInput, offer: PricedOffer) {
  return {
    title: input.title,
    currency: input.currency,
    tier: input.tier,
    pricing_mode: input.pricing_mode,
    pricing: offer,
    total_build: offer.total_build,
    total_monthly: offer.total_monthly,
    performance_terms: input.performance_terms,
    data_basis: input.data_basis,
    sections: input.sections,
  };
}

/** The four mandatory sections, non-blank (TS is UX; the issue RPC enforces). */
function missingRequiredSections(sections: ProposalInput['sections']): string[] {
  return PROPOSAL_REQUIRED_SECTION_KEYS.filter((key) => {
    const s = sections.find((x) => x.key === key);
    return !s || s.body_md.trim() === '';
  });
}

async function latestUsableBriefId(admin: SupabaseClient, engagementId: string): Promise<string | null> {
  const { data } = await admin
    .from('engagement_briefs')
    .select('id')
    .eq('engagement_id', engagementId)
    .in('status', ['completed', 'partial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// ── Create / save ────────────────────────────────────────────────────────────

/**
 * Create v1 (or the next version when none is open). The hard gate — a
 * submitted questionnaire AND a completed|partial brief from THAT submission
 * — is enforced by the RPC; the panel's disabled button is UX.
 */
export async function createProposal(engagementId: string, input: unknown): Promise<{ proposalId: string }> {
  await requireAdmin();
  const eid = parseInput(uuidSchema, engagementId);
  const parsed = parseInput(proposalInputSchema, input);
  const offer = canonicalOffer(parsed.offer);

  const admin = createAdminClient();
  const engagement = await loadEngagement(admin, eid);
  const seeded = seedSections(engagement.locale);
  const sections = parsed.sections.map((s) =>
    (s.key === 'terms' || s.key === 'next_steps') && s.body_md.trim() === ''
      ? { ...s, body_md: seeded.find((x) => x.key === s.key)!.body_md }
      : s,
  );
  const briefId = await latestUsableBriefId(admin, eid);

  const { data, error } = await admin.rpc('create_engagement_proposal', {
    p_engagement_id: eid,
    p_title: parsed.title,
    p_currency: parsed.currency,
    p_tier: parsed.tier,
    p_pricing_mode: parsed.pricing_mode,
    p_pricing: offer,
    p_total_build: offer.total_build,
    p_total_monthly: offer.total_monthly,
    p_performance_terms: parsed.performance_terms,
    p_sections: sections,
    p_data_basis: parsed.data_basis,
    p_brief_id: briefId,
    p_source_snapshot: null,
    p_supersede_id: null,
  });
  if (error) throw translateDbError(error, 'Failed to create the proposal.');
  const proposalId = data as string;

  if (parsed.valid_until) {
    const { error: vErr } = await admin.from('engagement_proposals').update({ valid_until: parsed.valid_until }).eq('id', proposalId);
    if (vErr) console.error('[proposal] valid_until on create failed:', vErr);
  }

  revalidate(eid);
  return { proposalId };
}

/**
 * Save the whole document (draft|ready only). One fenced UPDATE on
 * content_version; zero rows = it changed underneath you. On `ready` the
 * patch includes status:'draft' — the guard requires it, and the panel says so.
 */
export async function saveProposal(
  proposalId: string,
  input: unknown,
  expectedContentVersion: number,
): Promise<{ content_version: number; status: 'draft' | 'ready' }> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const expected = parseInput(contentVersionSchema, expectedContentVersion);
  const parsed = parseInput(proposalInputSchema, input);
  const offer = canonicalOffer(parsed.offer);

  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status !== 'draft' && p.status !== 'ready') {
    throw new Error('This proposal has been issued — its content is frozen. Revise to create a new version.');
  }
  if (p.drafting_status === 'generating') throw new Error('AI is drafting — edits unlock when it finishes.');

  const patch: Record<string, unknown> = { ...contentPatch(parsed, offer), valid_until: parsed.valid_until };
  if (p.status === 'ready') patch.status = 'draft';

  const { data, error } = await admin
    .from('engagement_proposals')
    .update(patch)
    .eq('id', pid)
    .eq('content_version', expected)
    .in('status', ['draft', 'ready'])
    .select('content_version, status');
  if (error) throw translateDbError(error, 'Failed to save the proposal.');
  if (!data || data.length === 0) {
    throw new Error('This proposal changed in another tab — reload before saving.');
  }
  const row = data[0] as { content_version: number; status: 'draft' | 'ready' };
  revalidate(p.engagement_id);
  return { content_version: row.content_version, status: row.status };
}

// ── Review gate ──────────────────────────────────────────────────────────────

export async function markProposalReady(proposalId: string): Promise<void> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status !== 'draft') throw new Error('Only a draft can be marked ready.');
  if (p.drafting_status === 'generating') throw new Error('Wait for the AI draft to finish first.');
  const missing = missingRequiredSections(p.sections);
  if (missing.length) {
    throw new Error(`Fill in ${missing.map((k) => k.replace('_', ' ')).join(', ')} before marking the proposal ready.`);
  }

  const { data, error } = await admin
    .from('engagement_proposals')
    .update({ status: 'ready' })
    .eq('id', pid)
    .eq('status', 'draft')
    .eq('content_version', p.content_version)
    .neq('drafting_status', 'generating')
    .select('id');
  if (error) throw translateDbError(error, 'Failed to mark the proposal ready.');
  if (!data || data.length === 0) throw new Error('This proposal changed in another tab (or an AI draft just started) — reload.');
  await logEvent(admin, p.engagement_id, 'proposal_ready', `Proposal v${p.version} reviewed and marked ready to issue`, {
    proposal_id: pid,
    version: p.version,
    content_version: p.content_version,
  });
  revalidate(p.engagement_id);
}

export async function proposalBackToDraft(proposalId: string): Promise<void> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status !== 'ready') throw new Error('Only a ready proposal can go back to draft.');
  const { error } = await admin.from('engagement_proposals').update({ status: 'draft' }).eq('id', pid).eq('status', 'ready');
  if (error) throw translateDbError(error, 'Failed to move the proposal back to draft.');
  await logEvent(admin, p.engagement_id, 'proposal_back_to_draft', `Proposal v${p.version} moved back to draft`, {
    proposal_id: pid,
    version: p.version,
  });
  revalidate(p.engagement_id);
}

// ── Issue (the freeze) ───────────────────────────────────────────────────────

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * ready → sent. The PDF is rendered from buildIssuedSnapshot(...) BEFORE the
 * RPC and uploaded; the RPC's CAS covers both reads the snapshot came from.
 * On applied:false or throw the uploaded object is deleted. Slice A: 'manual'
 * delivery (Ryan downloads the archive and sends it himself). 'link' is slice B.
 */
export async function issueProposal(
  proposalId: string,
  delivery: 'link' | 'manual',
): Promise<{ delivery: 'manual'; downloadPath: string; validUntil: string }> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  if (delivery !== 'manual') {
    throw new Error('Link delivery is not available yet — issue for manual delivery and send the PDF yourself.');
  }
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status !== 'ready') throw new Error('Mark the proposal ready before issuing it.');
  const missing = missingRequiredSections(p.sections);
  if (missing.length) throw new Error('Fill in the executive summary, recommendation, scope and terms before issuing.');
  const engagement = await loadEngagement(admin, p.engagement_id);

  const now = new Date();
  const today = hstDateOf(now);
  if (p.valid_until && p.valid_until < today) {
    throw new Error('The validity date is in the past — move it forward (or clear it for issue date + 30 days) before issuing.');
  }
  const validUntil = p.valid_until ?? addDays(today, VALIDITY_DAYS);
  const snapshot = buildIssuedSnapshot(p, engagement, now);
  const model = buildProposalDocModel(snapshot, { validUntil, preview: false });
  const pdf = await generateProposalPdf(model);
  const sha = createHash('sha256').update(pdf).digest('hex');
  const path = proposalPdfPath(engagement.id, p.id, p.version);

  const store = admin.storage.from(ENGAGEMENT_DOCUMENTS_BUCKET);
  const { error: upErr } = await store.upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (upErr) {
    console.error('[proposal] PDF upload failed:', upErr);
    throw new Error('Failed to archive the PDF — nothing was issued. Try again.');
  }

  const { data, error } = await admin.rpc('issue_engagement_proposal', {
    p_proposal_id: p.id,
    p_content_version: p.content_version,
    p_engagement_updated_at: engagement.updated_at,
    p_issued_snapshot: snapshot,
    p_pdf_path: path,
    p_pdf_sha256: sha,
    p_delivery: 'manual',
    p_token_hash: null,
    p_token_expires_at: null,
    p_valid_until: validUntil,
  });
  const result = (data ?? null) as { applied?: boolean; reason?: string; valid_until?: string } | null;
  if (error || !result?.applied) {
    await store.remove([path]);
    if (error) throw translateDbError(error, 'Failed to issue the proposal.');
    if (result?.reason === 'stale') throw new Error('This proposal (or the engagement contact) changed underneath you — reload and issue again.');
    if (result?.reason === 'not_ready') throw new Error('Mark the proposal ready before issuing it.');
    throw new Error('Failed to issue the proposal.');
  }

  revalidate(p.engagement_id);
  return {
    delivery: 'manual',
    downloadPath: `/api/admin/engagements/${engagement.id}/proposal/${p.id}/pdf`,
    validUntil: result.valid_until ?? validUntil,
  };
}

// ── Withdraw / revise ────────────────────────────────────────────────────────

export async function withdrawProposal(proposalId: string): Promise<void> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status !== 'draft' && p.status !== 'ready' && p.status !== 'sent') {
    throw new Error('Only a draft, ready or issued proposal can be withdrawn.');
  }
  if (p.drafting_status === 'generating') throw new Error('Wait for the AI draft to finish before withdrawing.');
  const patch: Record<string, unknown> = { status: 'withdrawn', withdrawn_at: new Date().toISOString() };
  if (p.access_token_hash && !p.token_revoked_at) patch.token_revoked_at = new Date().toISOString();
  const { data, error } = await admin.from('engagement_proposals').update(patch).eq('id', pid).eq('status', p.status).select('id');
  if (error) throw translateDbError(error, 'Failed to withdraw the proposal.');
  if (!data || data.length === 0) throw new Error('This proposal changed underneath you — reload.');
  await logEvent(admin, p.engagement_id, 'proposal_withdrawn', `Proposal v${p.version} withdrawn (was ${p.status})`, {
    proposal_id: pid,
    version: p.version,
    previous_status: p.status,
  });
  revalidate(p.engagement_id);
}

/**
 * Revise = a new version at draft carrying this row's content, brief_id and
 * source_snapshot. Supersedes the source only when it is still open
 * (draft|ready|sent); a withdrawn / voided / superseded source is copied
 * without superseding — its slot is already free.
 */
export async function reviseProposal(proposalId: string): Promise<{ proposalId: string }> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status === 'accepted') throw new Error('Void the acceptance before revising an accepted proposal.');
  if (p.drafting_status === 'generating') throw new Error('Wait for the AI draft to finish first.');
  const supersede = p.status === 'draft' || p.status === 'ready' || p.status === 'sent';

  const { data, error } = await admin.rpc('create_engagement_proposal', {
    p_engagement_id: p.engagement_id,
    p_title: p.title,
    p_currency: p.currency,
    p_tier: p.tier,
    p_pricing_mode: p.pricing_mode,
    p_pricing: p.pricing,
    p_total_build: p.total_build,
    p_total_monthly: p.total_monthly,
    p_performance_terms: p.performance_terms,
    p_sections: p.sections,
    p_data_basis: p.data_basis,
    p_brief_id: p.brief_id ?? (await latestUsableBriefId(admin, p.engagement_id)),
    p_source_snapshot: p.source_snapshot,
    p_supersede_id: supersede ? p.id : null,
  });
  if (error) throw translateDbError(error, 'Failed to revise the proposal.');
  revalidate(p.engagement_id);
  return { proposalId: data as string };
}

// ── Accept (admin) / void ────────────────────────────────────────────────────

/**
 * A signed PDF / verbal yes. Only an ISSUED proposal can be accepted (a ready
 * one has not been frozen, so there is nothing to accept). One RPC moves the
 * engagement to Build with its contract value; then Ryan's notification.
 */
export async function markProposalAccepted(
  proposalId: string,
  acceptedByName: string,
): Promise<{ stageMoved: boolean; notified: boolean }> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const name = parseInput(acceptedByNameSchema, acceptedByName);
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status !== 'sent') {
    throw new Error(p.status === 'accepted' ? 'This proposal is already accepted.' : 'Issue the proposal first — only an issued proposal can be accepted.');
  }
  const { data, error } = await admin.rpc('accept_engagement_proposal', {
    p_proposal_id: pid,
    p_accepted_by_name: name,
    p_via: 'admin',
    p_token_hash: null,
  });
  if (error) throw translateDbError(error, 'Failed to record the acceptance.');
  const result = (data ?? {}) as { applied?: boolean; reason?: string; stage_moved?: boolean };
  if (!result.applied) {
    if (result.reason === 'already_accepted') throw new Error('This proposal is already accepted.');
    throw new Error('This proposal is no longer open — reload.');
  }

  const [accepted, engagement] = await Promise.all([loadProposal(admin, pid), loadEngagement(admin, p.engagement_id)]);
  const notified = await notifyProposalAccepted(admin, accepted, engagement, result.stage_moved === true);
  revalidate(p.engagement_id, engagement.lead_id);
  return { stageMoved: result.stage_moved === true, notified: notified.ok };
}

export async function voidProposalAcceptance(proposalId: string, reason: string): Promise<{ stageReverted: boolean }> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const why = parseInput(voidReasonSchema, reason);
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  const { data, error } = await admin.rpc('void_engagement_proposal_acceptance', { p_proposal_id: pid, p_reason: why });
  if (error) throw translateDbError(error, 'Failed to void the acceptance.');
  const result = (data ?? {}) as { applied?: boolean; reason?: string; stage_reverted?: boolean };
  if (!result.applied) throw new Error('Only an accepted proposal can be voided.');
  const engagement = await loadEngagement(admin, p.engagement_id);
  revalidate(p.engagement_id, engagement.lead_id);
  return { stageReverted: result.stage_reverted === true };
}

// ── Ryan's notification ──────────────────────────────────────────────────────

export async function resendAcceptNotification(proposalId: string): Promise<void> {
  await requireAdmin();
  const pid = parseInput(uuidSchema, proposalId);
  const admin = createAdminClient();
  const p = await loadProposal(admin, pid);
  if (p.status !== 'accepted' || !p.accepted_at) throw new Error('Only an accepted proposal has an acceptance to notify.');
  const engagement = await loadEngagement(admin, p.engagement_id);
  const result = await notifyProposalAccepted(admin, p, engagement, engagement.stage === 'build');
  revalidate(p.engagement_id);
  if (!result.ok) throw new Error('The notification email failed again — check RESEND_API_KEY / ADMIN_EMAIL.');
}
