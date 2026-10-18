import { NextResponse } from 'next/server';
import { authorizeSession } from '@/lib/discover/session';
import { hashVerificationCode, newVerificationCode } from '@/lib/discover/otp';
import { getFromAddress, getResendClient } from '@/lib/email/client';

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const auth = await authorizeSession(sessionId);
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const resend = getResendClient();
  if (!resend) return NextResponse.json({ error: 'Email verification is temporarily unavailable' }, { status: 503 });
  const { session, supabase } = auth;
  const { data: lead, error: leadError } = await supabase.from('leads').select('email').eq('id', session.lead_id).single();
  if (leadError || !lead) {
    console.error('[discover/verify/send] lead lookup failed:', leadError?.message ?? 'no lead');
    return NextResponse.json({ error: 'Could not load verification' }, { status: 503 });
  }
  const code = newVerificationCode();
  const { data: otpId, error } = await supabase.rpc('issue_discovery_email_otp', {
    p_lead_id: session.lead_id, p_code_hash: hashVerificationCode(session.lead_id, code),
  });
  if (error) {
    console.error('[discover/verify/send] issue failed:', error.message);
    return NextResponse.json({ error: 'Verification is temporarily unavailable' }, { status: 503 });
  }
  if (!otpId) return NextResponse.json({ error: 'Please wait before requesting another code. Maximum 3 per hour.' }, { status: 429 });
  try {
    const { error: sendError } = await resend.emails.send({
      from: getFromAddress(), to: lead.email,
      subject: 'Your HonuVibe verification code',
      text: `Your HonuVibe Discovery code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    });
    if (sendError) throw new Error(`Delivery failed: ${sendError.message}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[discover/verify/send] delivery failed:', err instanceof Error ? err.message : err);
    // Retain the row for cooldown accounting, but never accept a failed send.
    const { error: voidError } = await supabase.from('email_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otpId);
    if (voidError) console.error('[discover/verify/send] could not void unsent code:', voidError.message);
    return NextResponse.json({ error: 'Could not send the code. Please try again later.' }, { status: 503 });
  }
}
