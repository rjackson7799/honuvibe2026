import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeSession } from '@/lib/discover/session';

// POST /api/discover/verify/[sessionId] — email OTP verification.
// STUB (Increment 1): accepts any 6-digit code, marks the lead verified, and
// advances lifecycle → 'verified'. Real Resend OTP (email_otps + lib/otp.ts,
// 10-min expiry, 5 attempts, 60s resend) swaps in here in a later increment.

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

  const { error } = await supabase
    .from('leads')
    .update({ email_verified: true, lifecycle: 'verified' })
    .eq('id', session.lead_id);

  if (error) {
    console.error('[discover/verify] update failed:', error.message);
    return NextResponse.json({ error: 'Could not verify' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verified: true });
}
