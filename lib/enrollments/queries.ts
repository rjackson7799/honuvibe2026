import { createClient } from '@/lib/supabase/server';
import type { Enrollment, EnrollmentWithCourse, EnrollmentCheck } from './types';

export async function getUserEnrollments(
  userId: string,
): Promise<EnrollmentWithCourse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
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

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', course.id)
    .eq('status', 'active')
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
