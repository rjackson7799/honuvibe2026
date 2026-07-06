import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Admin polling endpoint. GET ?reportIds=id1,id2 → status (+ generation_error)
 * per report so the New-report form can flip from "generating" to "review" or
 * "failed" without a full page reload.
 */
export async function GET(request: NextRequest) {
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
  if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const idsParam = request.nextUrl.searchParams.get('reportIds') ?? '';
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ reports: [] });

  const admin = createAdminClient();
  const { data: reports } = await admin
    .from('session_reports')
    .select('id, status')
    .in('id', ids);
  const { data: priv } = await admin
    .from('session_report_private')
    .select('report_id, generation_error')
    .in('report_id', ids);

  const errById = new Map(
    (priv ?? []).map((p) => [p.report_id as string, p.generation_error as string | null]),
  );

  return NextResponse.json({
    reports: (reports ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      generation_error: errById.get(r.id) ?? null,
    })),
  });
}
