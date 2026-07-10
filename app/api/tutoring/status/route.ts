import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Admin/instructor polling endpoint. GET ?reportIds=id1,id2 → status (+
 * generation_error) per report so the New-report form can flip from
 * "generating" to "review" or "failed" without a full page reload.
 *
 * Admins get every requested id back unscoped. Instructors are scoped to
 * reports whose course they're assigned to (via `course_instructors`) —
 * requested ids outside that set are silently dropped rather than erroring,
 * so an instructor polling a mix of their own + someone else's report ids
 * only ever learns the status of their own.
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
  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const idsParam = request.nextUrl.searchParams.get('reportIds') ?? '';
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ reports: [] });

  const admin = createAdminClient();

  // Unrestricted (null) for admin; a course_id allow-set for an instructor.
  let allowedCourseIds: Set<string> | null = null;
  if (profile.role === 'instructor') {
    const { data: instructorProfile } = await admin
      .from('instructor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!instructorProfile) return NextResponse.json({ reports: [] });

    const { data: links } = await admin
      .from('course_instructors')
      .select('course_id')
      .eq('instructor_id', instructorProfile.id);
    allowedCourseIds = new Set((links ?? []).map((l) => l.course_id as string));
  }

  const { data: reports } = await admin
    .from('session_reports')
    .select('id, status, course_id')
    .in('id', ids);
  const scoped = allowedCourseIds
    ? (reports ?? []).filter((r) => allowedCourseIds!.has(r.course_id as string))
    : (reports ?? []);
  if (scoped.length === 0) return NextResponse.json({ reports: [] });

  const scopedIds = scoped.map((r) => r.id as string);
  const { data: priv } = await admin
    .from('session_report_private')
    .select('report_id, generation_error')
    .in('report_id', scopedIds);

  const errById = new Map(
    (priv ?? []).map((p) => [p.report_id as string, p.generation_error as string | null]),
  );

  return NextResponse.json({
    reports: scoped.map((r) => ({
      id: r.id,
      status: r.status,
      generation_error: errById.get(r.id as string) ?? null,
    })),
  });
}
