import 'server-only';
import { createHmac, randomInt } from 'node:crypto';

export function newVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashVerificationCode(leadId: string, code: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Verification is not configured');
  // Bind codes to a lead and a server-held key; a DB hash is not an offline
  // six-digit guessing oracle. Rotating the service key invalidates old codes.
  return createHmac('sha256', key).update(`discover-otp:${leadId}:${code}`).digest('hex');
}
