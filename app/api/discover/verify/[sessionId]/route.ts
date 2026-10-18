import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeSession } from '@/lib/discover/session';
import { hashVerificationCode } from '@/lib/discover/otp';

// POST /api/discover/verify/[sessionId] — email OTP verification.
// Database locking enforces expiry, attempt limits and single use atomically.

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid code', issues: parsed.error.flatten() }, { status: 400 });
  }

  const auth = await authorizeSession(sessionId);
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { supabase, session } = auth;

  const { data: verified, error } = await supabase.rpc('verify_discovery_email_otp', {
    p_lead_id: session.lead_id,
    p_code_hash: hashVerificationCode(session.lead_id, parsed.data.code),
  });

  if (error) {
    console.error('[discover/verify] verify rpc failed:', error.message);
    return NextResponse.json({ error: 'Could not verify' }, { status: 500 });
  }

  if (verified !== true) {
    return NextResponse.json({ error: 'Invalid or expired code. Request a new code after 5 unsuccessful attempts.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, verified: true });
}
