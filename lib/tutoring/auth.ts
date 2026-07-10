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

type CallerResult =
  | { ok: true; userId: string; role: TutoringRole }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Identity + role gate, always run BEFORE any resource lookup (auth-before-
 * load): a 404 must never leak resource existence to an unauthenticated or
 * unauthorized caller.
 */
async function resolveCaller(): Promise<CallerResult> {
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

  if (profile?.role === 'admin' || profile?.role === 'instructor') {
    return { ok: true, userId: user.id, role: profile.role };
  }
  return { ok: false, status: 403, error: 'Forbidden' };
}

/** Course-level authorization for an already-resolved caller. */
async function authorizeForCourse(
  caller: { userId: string; role: TutoringRole },
  courseId: string,
): Promise<TutoringAccessResult> {
  // Admins pass unconditionally — never require (or look up) an
  // instructor_profiles row. Keeps the admin path to two queries.
  if (caller.role === 'admin') {
    return {
      ok: true,
      access: { role: 'admin', userId: caller.userId, instructorProfileId: null, courseId },
    };
  }

  // Deliberately NOT RLS-dependent — the gate must hold even if policies drift.
  const admin = createAdminClient();
  const { data: instructorProfile } = await admin
    .from('instructor_profiles')
    .select('id')
    .eq('user_id', caller.userId)
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
      userId: caller.userId,
      instructorProfileId: instructorProfile.id,
      courseId,
    },
  };
}

export async function getTutoringAccess(courseId: string): Promise<TutoringAccessResult> {
  const caller = await resolveCaller();
  if (!caller.ok) return caller;
  return authorizeForCourse(caller, courseId);
}

export async function getTutoringAccessForReport(
  reportId: string,
): Promise<TutoringAccessResult> {
  // Auth BEFORE the report lookup: an unauthenticated (401) or wrong-role
  // (403) caller must get the same answer whether or not the report exists —
  // otherwise the 404 becomes a report-existence oracle.
  const caller = await resolveCaller();
  if (!caller.ok) return caller;

  const admin = createAdminClient();
  const { data: report } = await admin
    .from('session_reports')
    .select('course_id')
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return { ok: false, status: 404, error: 'Report not found' };

  return authorizeForCourse(caller, report.course_id);
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
