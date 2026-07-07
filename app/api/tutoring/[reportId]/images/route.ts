import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { SourceImageRef } from '@/lib/tutoring/types';

const BUCKET = 'tutoring-private';
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Admin-only: mint short-lived signed URLs to re-view a report's worksheet
 * photos. The bucket has no SELECT policy, so reads go through the service role
 * after an explicit admin check (mirrors the transcript route).
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
      .select('source_image_refs')
      .eq('report_id', reportId)
      .maybeSingle();
    const refs = (priv?.source_image_refs ?? []) as SourceImageRef[];
    if (refs.length === 0) {
      return NextResponse.json({ error: 'No worksheet photos on file.' }, { status: 404 });
    }

    const { data: signed, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrls(
        refs.map((r) => r.path),
        SIGNED_URL_EXPIRY_SECONDS,
      );
    if (error || !signed) {
      return NextResponse.json(
        { error: error?.message ?? 'Failed to mint signed URLs.' },
        { status: 500 },
      );
    }

    const urls = signed
      .filter((s) => s.signedUrl)
      .map((s) => ({ path: s.path ?? '', url: s.signedUrl as string }));
    return NextResponse.json({ images: urls });
  } catch (error) {
    console.error('[Tutoring Images] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
