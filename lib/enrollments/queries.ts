import { createClient } from '@/lib/supabase/server';
import type {
  Enrollment,
  EnrollmentStatus,
  EnrollmentWithCourse,
} from './types';

// Defaults to active-only: the dashboard overview's active_courses stat
// counts the result directly (lib/dashboard/queries.ts).
export async function getUserEnrollments(
  userId: string,
  statuses: EnrollmentStatus[] = ['active'],
): Promise<EnrollmentWithCourse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('enrollments')
    .select('*, course:course_catalog(*)')
    .eq('user_id', userId)
    .in('status', statuses)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as EnrollmentWithCourse[];
}

// Course access (B3) lives in ./access so tests can mock checkVaultAccess locally.
export { getLiveEnrollment, hasCourseAccess } from './access';

export async function getEnrollmentByCourseId(
  userId: string,
  courseId: string,
): Promise<Enrollment | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .maybeSingle();

  return data as Enrollment | null;
}
