import { createClient } from '@/lib/supabase/server';
import type {
  Enrollment,
  EnrollmentStatus,
  EnrollmentWithCourse,
  EnrollmentCheck,
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
    .select('*, course:courses(*)')
    .eq('user_id', userId)
    .in('status', statuses)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as EnrollmentWithCourse[];
}

export async function checkEnrollment(
  userId: string,
  courseSlug: string,
): Promise<EnrollmentCheck> {
  const supabase = await createClient();

  // First get course ID from slug
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', courseSlug)
    .single();

  if (!course) return { is_enrolled: false, enrollment: null };

  // 'completed' still counts as enrolled: finishing a course must not revoke
  // hub access or the ability to un-mark items. Refunded/cancelled do not.
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', course.id)
    .in('status', ['active', 'completed'])
    .maybeSingle();

  return {
    is_enrolled: !!enrollment,
    enrollment: enrollment as Enrollment | null,
  };
}

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
