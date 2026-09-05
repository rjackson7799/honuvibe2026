'use server';

// Discovery questionnaire — admin server actions (slice 2). Same shape as
// ./engagement-actions.ts: requireAdmin(), zod-parsed input, the service-role
// client for the write, revalidatePath afterwards. The lifecycle these actions
// implement (stated once in the plan, "EngagementDiscoveryPanel"):
//
//   draft / ready   any manifest save deletes every answer row and bumps
//                   questions_version (draft test-fills are throwaway).
//                   markReady is the human-review gate; backToDraft reverses.
//   send            requires status='ready' AND a client_contact_email. Mints
//                   the token, stores ONLY the hash, emails the client, logs
//                   questionnaire_sent, returns the URL ONCE. If the email
//                   fails the token is still valid: {url, emailed:false}.
//   after send      reword-only: prompts / help / labels / section titles may
//                   change; adding, removing, reordering, retyping, or
//                   changing option values / flags is rejected. No bump.
//   resend          = rotate: new token, old one replaced, expiry extended,
//                   fresh email, another questionnaire_sent event.
//   revoke          revokes without replacing.
//   reopen          submitted -> in_progress, RETAINS answer_snapshot, needs a
//                   still-valid token (else resend first); the DB guard
//                   raises brief_in_flight while a brief is generating.
//   start over      any status -> draft: status FIRST (the answer lock allows
//                   DELETE only while draft/ready), then delete answers, then
//                   revoke the token + clear the snapshot, then log. Same row.
//
// Tailoring is NOT here: it is the synchronous
// POST /api/admin/engagements/[id]/questionnaire/tailor route.
//
// TOKEN HYGIENE: the plaintext token exists only in the return value of
// sendQuestionnaire / resendQuestionnaire. It is never logged, never put in an
// event's data or summary (the RLS suite scans for 64-hex strings), and never
// stored anywhere but as its sha256.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendDiscoveryQuestionnaireInvite } from './emails';
import { structuralViolation } from './manifest-diff';
import type { EngagementEventKind } from './types';
import {
  questionnaireManifestSchema,
  type EngagementQuestion,
  type QuestionnaireSection,
} from './questions-schema';
import { QUESTIONNAIRE_TEMPLATES, isTemplateKey, resolveTemplate } from './templates';
import {
  discoveryPath,
  mintQuestionnaireToken,
  questionnaireEntryUrl,
  tokenExpiryFrom,
} from './questionnaire-token';
import { notifySubmission } from './notify';
import type { Engagement, EngagementQuestionnaire } from '@/lib/admin/types';

// ── Auth + parse helpers (the engagement-actions idiom) ─────────────────────

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

const manifestInputSchema = z.object({
  title: z.string().trim().min(1, 'A title is required').max(200),
  intro_md: z
    .string()
    .max(5000)
    .nullish()
    .transform((v) => {
      const t = v?.trim() ?? '';
      return t === '' ? null : t;
    }),
  sections: z.array(z.unknown()),
  questions: z.array(z.unknown()),
});

function revalidate(engagementId: string): void {
  revalidatePath(`/admin/studio/engagements/${engagementId}`);
  revalidatePath('/admin/studio/engagements');
}

async function loadQuestionnaire(
  admin: SupabaseClient,
  questionnaireId: string,
): Promise<EngagementQuestionnaire> {
  const { data, error } = await admin
    .from('engagement_questionnaires')
    .select('*')
    .eq('id', questionnaireId)
    .maybeSingle();
  if (error) {
    console.error('[questionnaire] load failed:', error);
    throw new Error('Failed to load the questionnaire.');
  }
  if (!data) throw new Error('Questionnaire not found.');
  return data as unknown as EngagementQuestionnaire;
}

async function loadEngagement(admin: SupabaseClient, engagementId: string): Promise<Engagement> {
  const { data, error } = await admin.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (error) {
    console.error('[questionnaire] engagement load failed:', error);
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
  if (error) console.error(`[questionnaire] event ${kind} failed:`, error);
}

/** Map the DB's curated RAISE messages onto operator-readable errors. */
function translateDbError(error: { message?: string; code?: string }, fallback: string): Error {
  const m = error.message ?? '';
  if (m.includes('brief_in_flight')) {
    return new Error('A discovery brief is still generating from this submission — wait for it to finish (or fail) first.');
  }
  if (m.includes('questionnaire_answers_locked')) {
    return new Error('Answers are locked once the questionnaire has been sent.');
  }
  if (error.code === '23505') return new Error('That already exists.');
  console.error('[questionnaire]', fallback, error);
  return new Error(fallback);
}

async function deleteAnswers(admin: SupabaseClient, questionnaireId: string): Promise<void> {
  const { error } = await admin.from('engagement_questionnaire_answers').delete().eq('questionnaire_id', questionnaireId);
  if (error) throw translateDbError(error, 'Failed to clear the draft answers.');
}

// ── Draft ────────────────────────────────────────────────────────────────────

/**
 * Create the engagement's discovery questionnaire from a template, resolved
 * into the engagement's locale. Tailoring, if wanted, is the panel's next
 * call (the synchronous tailor route). One row per (engagement, kind) — a
 * second draft is refused by the UNIQUE constraint, never silently replaced.
 */
export async function draftFromTemplate(
  engagementId: string,
  templateKey: string,
): Promise<{ questionnaireId: string }> {
  await requireAdmin();
  const eid = parseInput(uuidSchema, engagementId);
  if (!isTemplateKey(templateKey)) throw new Error('Unknown template.');

  const admin = createAdminClient();
  const engagement = await loadEngagement(admin, eid);
  const resolved = resolveTemplate(QUESTIONNAIRE_TEMPLATES[templateKey], engagement.locale);

  const { data, error } = await admin
    .from('engagement_questionnaires')
    .insert({
      engagement_id: eid,
      kind: 'discovery',
      locale: engagement.locale,
      title: resolved.title,
      intro_md: resolved.intro_md,
      template_key: templateKey,
      sections: resolved.sections,
      questions: resolved.questions,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('This engagement already has a discovery questionnaire.');
    console.error('[questionnaire] draftFromTemplate insert failed:', error);
    throw new Error('Failed to draft the questionnaire.');
  }
  const questionnaireId = data.id as string;

  await logEvent(admin, eid, 'questionnaire_drafted', `Discovery questionnaire drafted from template (${resolved.questions.length} questions, ${engagement.locale})`, {
    questionnaire_id: questionnaireId,
    template_key: templateKey,
    question_count: resolved.questions.length,
    locale: engagement.locale,
  });

  revalidate(eid);
  return { questionnaireId };
}

// ── Manifest edits ───────────────────────────────────────────────────────────


/**
 * Save the whole manifest (the editor is a document, not per-question rows).
 * draft / ready: clears answers + bumps questions_version. sent / in_progress:
 * reword-only, no bump. submitted: refused (reopen or start over first).
 */
export async function saveManifest(
  questionnaireId: string,
  input: { title: string; intro_md?: string | null; sections: unknown[]; questions: unknown[] },
): Promise<{ questions_version: number }> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const raw = parseInput(manifestInputSchema, input);
  const manifest = parseInput(questionnaireManifestSchema, { sections: raw.sections, questions: raw.questions });

  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);

  if (q.status === 'submitted') {
    throw new Error('This questionnaire has been submitted. Reopen it or start over before editing.');
  }

  if (q.status === 'draft' || q.status === 'ready') {
    // CAS FIRST, then clear answers. The UPDATE is fenced on the version (and
    // tailoring state) we read; zero rows means the manifest moved underneath
    // us (a tailoring run finished, or another tab saved) and the operator's
    // edits must NOT be reported as saved. Answers written against the old
    // version are ignored by the view/RPC anyway, so deleting them after the
    // bump loses nothing — and a rejected save deletes nothing at all.
    const nextVersion = q.questions_version + 1;
    const { data, error } = await admin
      .from('engagement_questionnaires')
      .update({
        title: raw.title,
        intro_md: raw.intro_md,
        sections: manifest.sections,
        questions: manifest.questions,
        questions_version: nextVersion,
      })
      .eq('id', qid)
      .eq('questions_version', q.questions_version)
      .eq('tailoring_status', q.tailoring_status)
      .select('id');
    if (error) throw translateDbError(error, 'Failed to save the questionnaire.');
    if (!data || data.length === 0) {
      throw new Error('The questionnaire changed underneath you (a tailoring run may have finished) — reload and try again.');
    }
    await deleteAnswers(admin, qid);
    revalidate(q.engagement_id);
    return { questions_version: nextVersion };
  }

  // sent | in_progress — reword only.
  const violation = structuralViolation(q, manifest);
  if (violation) throw new Error(`Only wording can change after send: ${violation}.`);
  const { error } = await admin
    .from('engagement_questionnaires')
    .update({ title: raw.title, intro_md: raw.intro_md, sections: manifest.sections, questions: manifest.questions })
    .eq('id', qid);
  if (error) throw translateDbError(error, 'Failed to save the questionnaire.');
  revalidate(q.engagement_id);
  return { questions_version: q.questions_version };
}

// ── Review gate ──────────────────────────────────────────────────────────────

export async function markReady(questionnaireId: string): Promise<void> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);
  if (q.status !== 'draft') throw new Error('Only a draft can be marked ready.');
  if (q.tailoring_status === 'generating') throw new Error('Wait for tailoring to finish first.');
  if (!Array.isArray(q.questions) || q.questions.length === 0) throw new Error('Add at least one question first.');

  const { error } = await admin
    .from('engagement_questionnaires')
    .update({ status: 'ready' })
    .eq('id', qid)
    .eq('status', 'draft');
  if (error) throw translateDbError(error, 'Failed to mark the questionnaire ready.');
  await logEvent(admin, q.engagement_id, 'questionnaire_ready', 'Discovery questionnaire reviewed and marked ready to send', {
    questionnaire_id: qid,
    questions_version: q.questions_version,
  });
  revalidate(q.engagement_id);
}

export async function backToDraft(questionnaireId: string): Promise<void> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);
  if (q.status !== 'ready') throw new Error('Only a ready questionnaire can go back to draft.');

  const { error } = await admin
    .from('engagement_questionnaires')
    .update({ status: 'draft' })
    .eq('id', qid)
    .eq('status', 'ready');
  if (error) throw translateDbError(error, 'Failed to move the questionnaire back to draft.');
  await logEvent(admin, q.engagement_id, 'questionnaire_back_to_draft', 'Discovery questionnaire moved back to draft', {
    questionnaire_id: qid,
  });
  revalidate(q.engagement_id);
}

// ── Send / resend / revoke ───────────────────────────────────────────────────

function formatExpiry(date: Date, locale: 'en' | 'ja'): string {
  return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Pacific/Honolulu',
  });
}

/**
 * Mint + store a fresh token on the row and email the client. Shared by send
 * (from ready) and resend (rotate). The plaintext is returned ONCE and never
 * logged; the questionnaire_sent event carries only `emailed` and the expiry.
 */
async function issueAndEmail(
  admin: SupabaseClient,
  q: EngagementQuestionnaire,
  engagement: Engagement,
  mode: 'send' | 'resend',
): Promise<{ url: string; emailed: boolean; expiresAt: string }> {
  const email = engagement.client_contact_email?.trim() ?? '';
  if (!email) throw new Error('Add a client contact email to the engagement before sending.');

  const { token, hash } = mintQuestionnaireToken();
  const now = new Date();
  const expires = tokenExpiryFrom(now);

  const patch: Record<string, unknown> = {
    access_token_hash: hash,
    token_issued_at: now.toISOString(),
    token_expires_at: expires.toISOString(),
    token_revoked_at: null,
  };
  if (mode === 'send') {
    patch.status = 'sent';
    patch.sent_at = now.toISOString();
  }
  const { data, error } = await admin
    .from('engagement_questionnaires')
    .update(patch)
    .eq('id', q.id)
    .eq('status', q.status)
    .select('id');
  if (error) throw translateDbError(error, 'Failed to issue the questionnaire link.');
  if (!data || data.length === 0) throw new Error('The questionnaire changed underneath you — reload and try again.');

  const url = questionnaireEntryUrl(token);
  const sent = await sendDiscoveryQuestionnaireInvite({
    locale: q.locale,
    email,
    contactName: engagement.client_contact_name,
    businessName: engagement.title,
    entryUrl: url,
    expiresOn: formatExpiry(expires, q.locale),
  });
  if (!sent.ok) console.error('[questionnaire] invite email failed:', sent.error);

  await logEvent(
    admin,
    q.engagement_id,
    'questionnaire_sent',
    sent.ok
      ? `Discovery questionnaire ${mode === 'resend' ? 'link rotated and re-sent' : 'sent'} to ${email}`
      : `Discovery questionnaire link ${mode === 'resend' ? 'rotated' : 'issued'} — email to ${email} FAILED, send the link manually`,
    { questionnaire_id: q.id, emailed: sent.ok, expires_at: expires.toISOString(), mode },
  );

  return { url, emailed: sent.ok, expiresAt: expires.toISOString() };
}

/**
 * Send: requires status='ready' (the human-review gate — tailoring always
 * lands at draft, so an unreviewed AI draft can never reach a client) and a
 * client_contact_email. Returns the URL once; emailed:false means the token is
 * live but Ryan must send the link himself.
 */
export async function sendQuestionnaire(
  questionnaireId: string,
): Promise<{ url: string; emailed: boolean; expiresAt: string; path: string }> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);
  if (q.status !== 'ready') throw new Error('Mark the questionnaire ready before sending it.');
  const engagement = await loadEngagement(admin, q.engagement_id);

  const result = await issueAndEmail(admin, q, engagement, 'send');
  revalidate(q.engagement_id);
  return { ...result, path: discoveryPath(q.locale, q.id) };
}

/**
 * Resend = rotate. The plaintext is never stored, so "find the link later" is
 * this: a new token replaces the old one (which stops working), expiry is
 * extended, a fresh email goes out. Allowed while sent / in_progress, and on a
 * submitted row so an expired link can be renewed before a reopen.
 */
export async function resendQuestionnaire(
  questionnaireId: string,
): Promise<{ url: string; emailed: boolean; expiresAt: string; path: string }> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);
  if (q.status === 'draft' || q.status === 'ready') throw new Error('Send the questionnaire first.');
  const engagement = await loadEngagement(admin, q.engagement_id);

  const result = await issueAndEmail(admin, q, engagement, 'resend');
  revalidate(q.engagement_id);
  return { ...result, path: discoveryPath(q.locale, q.id) };
}

/** Revoke without replacing: the open tab's next autosave 403s. */
export async function revokeLink(questionnaireId: string): Promise<void> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);
  if (!q.access_token_hash) throw new Error('No link has been issued yet.');
  if (q.token_revoked_at) return; // already revoked — nothing to do

  const { error } = await admin
    .from('engagement_questionnaires')
    .update({ token_revoked_at: new Date().toISOString() })
    .eq('id', qid)
    .is('token_revoked_at', null);
  if (error) throw translateDbError(error, 'Failed to revoke the link.');
  await logEvent(admin, q.engagement_id, 'questionnaire_revoked', 'Discovery questionnaire link revoked', {
    questionnaire_id: qid,
  });
  revalidate(q.engagement_id);
}

// ── Reopen / start over ──────────────────────────────────────────────────────

/**
 * submitted -> in_progress. Retains answer_snapshot (the record of what was
 * submitted; a resubmit overwrites it). Requires a still-valid token — else
 * Ryan resends first. The 067 guard raises brief_in_flight while a brief is
 * generating; that surfaces as a readable error (the route-level 409).
 */
export async function reopenQuestionnaire(questionnaireId: string): Promise<void> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);
  if (q.status !== 'submitted') throw new Error('Only a submitted questionnaire can be reopened.');
  const tokenLive =
    !!q.access_token_hash &&
    !q.token_revoked_at &&
    !!q.token_expires_at &&
    new Date(q.token_expires_at).getTime() > Date.now();
  if (!tokenLive) throw new Error('The client link is no longer valid — resend it first, then reopen.');

  const { error } = await admin
    .from('engagement_questionnaires')
    .update({ status: 'in_progress' })
    .eq('id', qid)
    .eq('status', 'submitted');
  if (error) throw translateDbError(error, 'Failed to reopen the questionnaire.');
  await logEvent(admin, q.engagement_id, 'questionnaire_reopened', 'Discovery questionnaire reopened for the client to edit', {
    questionnaire_id: qid,
    questions_version: q.questions_version,
  });
  revalidate(q.engagement_id);
}

/**
 * Reset to draft from ANY status. Ordering is load-bearing:
 *   1. status = 'draft' FIRST — the answer lock allows DELETE only while the
 *      parent is draft/ready (and the guard raises brief_in_flight on the way
 *      out of submitted);
 *   2. delete the answer rows;
 *   3. revoke the token, clear answer_snapshot (+ the send/submit stamps and
 *      open counters, so the next cycle reads cleanly);
 *   4. log questionnaire_reset.
 * Same row, never a second (UNIQUE (engagement_id, kind)).
 */
export async function startOver(questionnaireId: string): Promise<void> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);

  if (q.status !== 'draft') {
    const { error } = await admin
      .from('engagement_questionnaires')
      .update({ status: 'draft' })
      .eq('id', qid)
      .eq('status', q.status);
    if (error) throw translateDbError(error, 'Failed to reset the questionnaire.');
  }

  await deleteAnswers(admin, qid);

  const clear: Record<string, unknown> = {
    answer_snapshot: null,
    submitted_at: null,
    notification_sent_at: null,
    sent_at: null,
    open_count: 0,
    first_opened_at: null,
    last_opened_at: null,
  };
  if (q.access_token_hash && !q.token_revoked_at) clear.token_revoked_at = new Date().toISOString();
  const { error } = await admin.from('engagement_questionnaires').update(clear).eq('id', qid);
  if (error) throw translateDbError(error, 'Failed to reset the questionnaire.');

  await logEvent(admin, q.engagement_id, 'questionnaire_reset', `Discovery questionnaire reset to draft (was ${q.status}); link revoked, answers cleared`, {
    questionnaire_id: qid,
    previous_status: q.status,
  });
  revalidate(q.engagement_id);
}

// ── Ryan's notification ──────────────────────────────────────────────────────

export async function resendNotification(questionnaireId: string): Promise<void> {
  await requireAdmin();
  const qid = parseInput(uuidSchema, questionnaireId);
  const admin = createAdminClient();
  const q = await loadQuestionnaire(admin, qid);
  if (!q.submitted_at) throw new Error('The questionnaire has not been submitted yet.');
  const engagement = await loadEngagement(admin, q.engagement_id);
  const result = await notifySubmission(admin, q, engagement);
  revalidate(q.engagement_id);
  if (!result.ok) throw new Error('The notification email failed again — check RESEND_API_KEY / ADMIN_EMAIL.');
}
