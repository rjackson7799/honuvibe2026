// Shared internals of the proposal/invoice server actions. A PLAIN server
// module, deliberately NOT 'use server':
//
//   1. a 'use server' file may only export ASYNC FUNCTIONS, and
//      translateDbError returns an Error synchronously;
//   2. rotateProposalToken takes a SupabaseClient, so exporting it from an
//      actions file would publish a server-action endpoint with
//      attacker-controlled arguments — the same rule that keeps
//      proposal-notify.ts and invoice-notify.ts out of the actions files.
//
// So the extraction lives here and BOTH proposal-actions.ts and
// invoice-actions.ts import it. resendProposalLink's behaviour is unchanged:
// it now calls rotateProposalToken instead of inlining the same UPDATE.

import type { SupabaseClient } from '@supabase/supabase-js';
import { mintProposalToken, proposalTokenExpiryFrom } from './proposal-token';
import { hstDateOf } from './proposal-document';
import type { EngagementProposal } from '@/lib/admin/types';

export const VALIDITY_DAYS = 30;

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatClientDate(iso: string | Date, locale: 'en' | 'ja'): string {
  const dateOnly = typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = dateOnly ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: dateOnly ? 'UTC' : 'Pacific/Honolulu',
  });
}

/** Every RAISE name in 074 and 075 (+ 23505 / 23514) → an operator-readable sentence. */
export function translateDbError(error: { message?: string; code?: string }, fallback: string): Error {
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
    ['proposal_not_accepted', 'Only an accepted proposal can be invoiced — accept it first.'],
    // 075 — the invoice RAISE names.
    ['invoice_pct_invalid', 'Choose 50% or 100% — no other split is supported.'],
    ['invoice_nothing_to_bill', 'There is nothing to invoice on this offer (the build investment is zero).'],
    ['invoice_already_issued', 'A deposit has already been issued for this proposal — void it before issuing another.'],
    ['invoice_below_minimum', 'That amount is below the minimum Stripe will charge ($0.50 / ¥50). Choose 100%, or bill it outside Stripe.'],
    ['invoice_recipient_required', 'Add a client contact email to the engagement before requesting a deposit.'],
    ['invoice_transition_invalid', "That change is not allowed from the invoice's current status."],
    ['invoice_identity_immutable', 'An issued invoice cannot be re-priced or re-addressed — void it and issue a new one.'],
    ['invoice_payment_locked', 'A recorded payment cannot be changed — refund it in Stripe instead.'],
    ['invoice_refund_shrunk', 'A refund can only grow, never shrink.'],
    ['invoice_amount_mismatch', 'The payment amount does not match the invoice — check it in Stripe.'],
    ['invoice_payment_intent_required', 'That payment carried no payment intent — check it in Stripe.'],
    ['deliverable_identity_immutable', 'A deliverable cannot be moved to another engagement.'],
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

export interface RotatedToken {
  /** The plaintext. It exists in this scope and the outgoing email ONLY. */
  token: string;
  expires: Date;
  validUntil: string;
}

/**
 * Rotate the proposal's magic-link token: a new hash replaces the old one
 * (which stops working), the link expiry resets to +45 d, token_revoked_at
 * clears, and valid_until becomes GREATEST(valid_until, HST today + 30) —
 * never shortened (the 074 guard enforces it).
 *
 * Extracted verbatim from resendProposalLink so the deposit request can reach
 * a manually-accepted client (no token at all), a client whose 45 days have
 * passed, and a client paying from a second device — all with one path.
 * The CAS on `status` makes a concurrent status change lose.
 */
export async function rotateProposalToken(
  admin: SupabaseClient,
  p: EngagementProposal,
  now: Date = new Date(),
): Promise<RotatedToken> {
  const { token, hash } = mintProposalToken();
  const expires = proposalTokenExpiryFrom(now);
  const floor = addDays(hstDateOf(now), VALIDITY_DAYS);
  const validUntil = p.valid_until && p.valid_until > floor ? p.valid_until : floor;

  const { data, error } = await admin
    .from('engagement_proposals')
    .update({
      access_token_hash: hash,
      token_issued_at: now.toISOString(),
      token_expires_at: expires.toISOString(),
      token_revoked_at: null,
      valid_until: validUntil,
    })
    .eq('id', p.id)
    .eq('status', p.status)
    .select('id');
  if (error) throw translateDbError(error, 'Failed to issue a new link.');
  if (!data || data.length === 0) throw new Error('This proposal changed underneath you — reload.');

  return { token, expires, validUntil };
}
