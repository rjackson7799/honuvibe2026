import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const BUCKET = 'tutoring-private';
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Admin-only: mint a short-lived signed URL to re-read a report's raw
 * transcript. The bucket has no SELECT policy, so the read goes through the
 * service role after an explicit admin check.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: priv } = await admin
      .from('session_report_private')
      .select('transcript_ref')
      .eq('report_id', reportId)
      .maybeSingle();
    if (!priv?.transcript_ref) {
      return NextResponse.json({ error: 'No transcript on file.' }, { status: 404 });
    }

    const { data: signed, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(priv.transcript_ref, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !signed) {
      return NextResponse.json(
        { error: error?.message ?? 'Failed to mint signed URL.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    console.error('[Tutoring Transcript] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
