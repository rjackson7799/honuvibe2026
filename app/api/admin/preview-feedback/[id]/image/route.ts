// GET /api/admin/preview-feedback/[id]/image?v=thumb|full
//
// The ONLY read path for feedback screenshots (bucket preview-feedback-images is
// private, no storage policies). Admin-only: any auth failure is a 404 so the
// route's existence isn't confirmed, and the service-role client is not even
// created. Then: validate uuid + variant, read image_path (service role), sign a
// 5-minute URL, 302 to it. Never cached.

import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { PREVIEW_FEEDBACK_IMAGE_BUCKET, thumbPathFor } from '@/lib/previews/feedback';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_URL_TTL_SECONDS = 300;

const HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };

function notFound(error: string) {
  return NextResponse.json({ error }, { status: 404, headers: HEADERS });
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin';
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin())) return notFound('Not found');

    const { id } = await params;
    if (!UUID_RE.test(id)) return notFound('Not found');

    const variant = new URL(request.url).searchParams.get('v') ?? 'full';
    if (variant !== 'thumb' && variant !== 'full') return notFound('Not found');

    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('preview_feedback')
      .select('image_path')
      .eq('id', id.toLowerCase())
      .maybeSingle<{ image_path: string | null }>();
    if (error || !row?.image_path) return notFound('Not found');

    const path = variant === 'thumb' ? thumbPathFor(row.image_path) : row.image_path;
    const { data: signed, error: signError } = await admin.storage
      .from(PREVIEW_FEEDBACK_IMAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) return notFound('Screenshot unavailable');

    return new NextResponse(null, {
      status: 302,
      headers: { ...HEADERS, Location: signed.signedUrl },
    });
  } catch (err) {
    console.error('[preview-feedback] image_signer_failed', err instanceof Error ? err.message : err);
    return notFound('Screenshot unavailable');
  }
}
