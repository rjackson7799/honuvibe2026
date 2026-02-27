import { createClient } from '@/lib/supabase/server';
import { getInstructorForCourse } from '@/lib/instructors/queries';
import type {
  Course,
  CourseWithCurriculum,
  CourseWeekWithContent,
} from './types';

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getFeaturedCourses(limit = 3): Promise<Course[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) return null;
  return data;
}

export async function getCourseWithCurriculum(
  slug: string,
): Promise<CourseWithCurriculum | null> {
  const supabase = await createClient();

  // Fetch course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (courseError || !course) return null;

  // Fetch weeks with all related content
  const { data: weeks } = await supabase
    .from('course_weeks')
    .select('*')
    .eq('course_id', course.id)
    .order('week_number', { ascending: true });

  if (!weeks) return { ...course, weeks: [] };

  // Fetch all sessions, assignments, vocabulary, resources for these weeks
  const weekIds = weeks.map((w) => w.id);

  const [sessionsRes, assignmentsRes, vocabularyRes, resourcesRes] =
    await Promise.all([
      supabase
        .from('course_sessions')
        .select('*')
        .in('week_id', weekIds)
        .order('session_number', { ascending: true }),
      supabase
        .from('course_assignments')
        .select('*')
        .in('week_id', weekIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('course_vocabulary')
        .select('*')
        .in('week_id', weekIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('course_resources')
        .select('*')
        .in('week_id', weekIds)
        .order('sort_order', { ascending: true }),
    ]);

  const sessions = sessionsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const vocabulary = vocabularyRes.data ?? [];
  const resources = resourcesRes.data ?? [];

  // Assemble weeks with content
  const weeksWithContent: CourseWeekWithContent[] = weeks.map((week) => ({
    ...week,
    sessions: sessions.filter((s) => s.week_id === week.id),
    assignments: assignments.filter((a) => a.week_id === week.id),
    vocabulary: vocabulary.filter((v) => v.week_id === week.id),
    resources: resources.filter((r) => r.week_id === week.id),
  }));

  // Fetch instructor profile if assigned
  const instructor = course.instructor_id
    ? await getInstructorForCourse(course.instructor_id)
    : null;

  return { ...course, weeks: weeksWithContent, instructor };
}

// Admin queries (bypass RLS via service role or admin session)
export async function getAdminCourses(): Promise<Course[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAdminCourseById(
  id: string,
): Promise<CourseWithCurriculum | null> {
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !course) return null;

  const { data: weeks } = await supabase
    .from('course_weeks')
    .select('*')
    .eq('course_id', course.id)
    .order('week_number', { ascending: true });

  if (!weeks) return { ...course, weeks: [] };

  const weekIds = weeks.map((w) => w.id);

  const [sessionsRes, assignmentsRes, vocabularyRes, resourcesRes] =
    await Promise.all([
      supabase
        .from('course_sessions')
        .select('*')
        .in('week_id', weekIds)
        .order('session_number', { ascending: true }),
      supabase
        .from('course_assignments')
        .select('*')
        .in('week_id', weekIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('course_vocabulary')
        .select('*')
        .in('week_id', weekIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('course_resources')
        .select('*')
        .in('week_id', weekIds)
        .order('sort_order', { ascending: true }),
    ]);

  const weeksWithContent: CourseWeekWithContent[] = weeks.map((week) => ({
    ...week,
    sessions: (sessionsRes.data ?? []).filter((s) => s.week_id === week.id),
    assignments: (assignmentsRes.data ?? []).filter(
      (a) => a.week_id === week.id,
    ),
    vocabulary: (vocabularyRes.data ?? []).filter(
      (v) => v.week_id === week.id,
    ),
    resources: (resourcesRes.data ?? []).filter((r) => r.week_id === week.id),
  }));

  // Fetch instructor profile if assigned
  const instructor = course.instructor_id
    ? await getInstructorForCourse(course.instructor_id)
    : null;

  return { ...course, weeks: weeksWithContent, instructor };
}
