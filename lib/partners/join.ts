/**
 * Partner join primitives — code normalization/generation and invite-token
 * hashing. Server-only (uses node:crypto).
 *
 * The DB is the authority on shape: `partner_join_codes.code` carries CHECK
 * constraints for `code = upper(btrim(code))` and `^[A-Z2-9]{8,24}$`. The
 * constants here mirror those exactly, and the generator draws from a STRICTER
 * alphabet that also drops the visually ambiguous `I` and `O` — a subset of
 * what the column accepts, so hand-entered legacy codes still validate.
 */

import { createHash, randomBytes, randomInt } from 'crypto';

/** Mirrors the `pjc_code_shape_ck` CHECK on partner_join_codes.code. */
export const JOIN_CODE_PATTERN = /^[A-Z2-9]{8,24}$/;

/** Generator alphabet: A–Z minus I/O, digits 2–9. 32 symbols = 5 bits each. */
const GENERATOR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const DEFAULT_JOIN_CODE_LENGTH = 10;

/** Raw invite tokens are 256-bit, hex-encoded. */
const INVITE_TOKEN_BYTES = 32;

/**
 * Normalize a user-supplied join code (URL segment, pasted text) to the form
 * stored in the database. Returns null when the result cannot be a valid code —
 * callers must treat that exactly like "code not found", with the same generic
 * message, so nothing leaks about which codes exist.
 */
export function normalizeJoinCode(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  return JOIN_CODE_PATTERN.test(normalized) ? normalized : null;
}

/** Cryptographically random join code drawn from the unambiguous alphabet. */
export function generateJoinCode(length: number = DEFAULT_JOIN_CODE_LENGTH): string {
  const size = Math.min(Math.max(length, 8), 24);
  let out = '';
  for (let i = 0; i < size; i += 1) {
    // randomInt is rejection-sampled, so there is no modulo bias.
    out += GENERATOR_ALPHABET[randomInt(0, GENERATOR_ALPHABET.length)];
  }
  return out;
}

/**
 * Fresh raw invite token. This value exists only in the invite URL — it is
 * never stored, logged, or sent to analytics. Only its hash reaches the DB.
 */
export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString('hex');
}

/** sha256 hex of a raw invite token — the form stored in partner_invites. */
export function hashInviteToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

/** Shape check for a raw token before it is hashed (cheap junk filter). */
export function isPlausibleInviteToken(raw: string | null | undefined): boolean {
  return typeof raw === 'string' && /^[0-9a-f]{64}$/.test(raw);
}

/**
 * Partially masks an invited address for display on the (pre-authentication)
 * invite page.
 *
 * Anyone holding the link can load that page, so showing the address in full
 * would turn a forwarded invite into an email disclosure. Enough is kept for
 * the real invitee to recognise which of their accounts to use.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '•••';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, 1);
  const domainParts = domain.split('.');
  const tld = domainParts.length > 1 ? `.${domainParts.slice(1).join('.')}` : '';
  const domainHead = domainParts[0]?.slice(0, 1) ?? '';
  return `${head}${'•'.repeat(Math.max(local.length - 1, 3))}@${domainHead}${'•'.repeat(
    Math.max((domainParts[0]?.length ?? 1) - 1, 3),
  )}${tld}`;
}

/**
 * Every outcome `redeem_partner_code()` / `accept_partner_invite()` can return.
 * Kept in lockstep with the RPC bodies in migration 064 — the join pages render
 * a message for each one, in EN and JA.
 */
export const JOIN_OUTCOMES = [
  'joined',
  'joined_no_seat',
  'already_member',
  'seat_revoked_previously',
  'conflict',
  'invalid',
  'expired',
  'exhausted',
] as const;

export type JoinOutcome = (typeof JOIN_OUTCOMES)[number];

export function isJoinOutcome(value: unknown): value is JoinOutcome {
  return (
    typeof value === 'string' && (JOIN_OUTCOMES as readonly string[]).includes(value)
  );
}

/** Outcomes that mean the user is now an active member of the partner. */
export const SUCCESS_OUTCOMES: readonly JoinOutcome[] = [
  'joined',
  'joined_no_seat',
  'already_member',
  'seat_revoked_previously',
];

export function isSuccessOutcome(outcome: JoinOutcome): boolean {
  return SUCCESS_OUTCOMES.includes(outcome);
}

/** The jsonb payload both entry RPCs return. */
export type JoinRpcResult = {
  outcome: JoinOutcome;
  reason?: string;
  partner_id?: string;
  partner_slug?: string;
  partner_name_en?: string;
  partner_name_jp?: string | null;
  seat_backed?: boolean;
  seat_granted?: boolean;
  has_seat?: boolean;
};
