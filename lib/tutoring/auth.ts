import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Shared tutoring authorization gate.
 *
 * Passes an admin unconditionally, or an instructor assigned to the specific
 * course via `course_instructors`. Everything else (unauthenticated, wrong
 * role, unassigned instructor) is rejected.
 *
 * Project invariant: all tutoring WRITES go through the service-role client
 * (`createAdminClient()`) after these code-level gates — RLS provides
 * instructor READ access only. Converting a tutoring action/route to the
 * user-scoped client would silently break teacher writes.
 */

export type TutoringRole = 'admin' | 'instructor';

export interface TutoringAccess {
  role: TutoringRole;
  userId: string;
  /** null for an admin with no instructor profile (e.g. Ryan). */
  instructorProfileId: string | null;
  courseId: string;
}

export type TutoringAccessResult =
  | { ok: true; access: TutoringAccess }
  | { ok: false; status: 401 | 403 | 404; error: string };

export async function getTutoringAccess(courseId: string): Promise<TutoringAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Admins pass unconditionally — never require (or look up) an
  // instructor_profiles row. Keeps the admin path to two queries.
  if (profile?.role === 'admin') {
    return {
      ok: true,
      access: { role: 'admin', userId: user.id, instructorProfileId: null, courseId },
    };
  }

  if (profile?.role === 'instructor') {
    // Deliberately NOT RLS-dependent — the gate must hold even if policies drift.
    const admin = createAdminClient();
    const { data: instructorProfile } = await admin
      .from('instructor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!instructorProfile) return { ok: false, status: 403, error: 'Forbidden' };

    const { data: link } = await admin
      .from('course_instructors')
      .select('id')
      .eq('course_id', courseId)
      .eq('instructor_id', instructorProfile.id)
      .maybeSingle();
    if (!link) return { ok: false, status: 403, error: 'Forbidden' };

    return {
      ok: true,
      access: {
        role: 'instructor',
        userId: user.id,
        instructorProfileId: instructorProfile.id,
        courseId,
      },
    };
  }

  return { ok: false, status: 403, error: 'Forbidden' };
}

export async function getTutoringAccessForReport(
  reportId: string,
): Promise<TutoringAccessResult> {
  const admin = createAdminClient();
  const { data: report } = await admin
    .from('session_reports')
    .select('course_id')
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return { ok: false, status: 404, error: 'Report not found' };
  return getTutoringAccess(report.course_id);
}

export async function requireTutoringAccess(courseId: string): Promise<TutoringAccess> {
  const result = await getTutoringAccess(courseId);
  if (!result.ok) throw new Error(result.error);
  return result.access;
}

export async function requireTutoringAccessForReport(reportId: string): Promise<TutoringAccess> {
  const result = await getTutoringAccessForReport(reportId);
  if (!result.ok) throw new Error(result.error);
  return result.access;
}
