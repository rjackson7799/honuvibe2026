import { createClient } from '@/lib/supabase/server';
import { getInstructorsForCourse } from '@/lib/instructors/queries';
import type {
  Course,
  CourseWithCurriculum,
  CourseWeekWithContent,
  EnrolledStudent,
} from './types';

export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .eq('is_private', false)
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
    .eq('is_private', false)
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

  if (!weeks) {
    const instructors = await getInstructorsForCourse(course.id);
    const lead = instructors.find((i) => i.role === 'lead') ?? instructors[0] ?? null;
    // Fetch bonus sessions even when there are no weeks
    const { data: bonusRaw } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('course_id', course.id)
      .eq('is_bonus', true)
      .order('scheduled_at', { ascending: true, nullsFirst: false });
    const instructorMap = new Map(
      instructors.map((ci) => [ci.instructor_id, ci.instructor]),
    );
    const bonusSessions = (bonusRaw ?? []).map((s) => ({
      ...s,
      instructor: s.instructor_id ? instructorMap.get(s.instructor_id) ?? null : null,
    }));
    return { ...course, weeks: [], bonusSessions, instructors, instructor: lead?.instructor ?? null };
  }

  // Fetch all sessions, assignments, vocabulary, resources for these weeks
  const weekIds = weeks.map((w) => w.id);

  const [sessionsRes, assignmentsRes, vocabularyRes, resourcesRes, bonusRes, instructors] =
    await Promise.all([
      supabase
        .from('course_sessions')
        .select('*')
        .in('week_id', weekIds)
        .eq('is_bonus', false)
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
      supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', course.id)
        .eq('is_bonus', true)
        .order('scheduled_at', { ascending: true, nullsFirst: false }),
      getInstructorsForCourse(course.id),
    ]);

  const sessions = sessionsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const vocabulary = vocabularyRes.data ?? [];
  const resources = resourcesRes.data ?? [];

  // Build instructor lookup for session-level instructor resolution
  const instructorMap = new Map(
    instructors.map((ci) => [ci.instructor_id, ci.instructor]),
  );

  // Resolve instructors on bonus sessions
  const bonusSessions = (bonusRes.data ?? []).map((s) => ({
    ...s,
    instructor: s.instructor_id ? instructorMap.get(s.instructor_id) ?? null : null,
  }));

  // Assemble weeks with content
  const weeksWithContent: CourseWeekWithContent[] = weeks.map((week) => ({
    ...week,
    sessions: sessions
      .filter((s) => s.week_id === week.id)
      .map((s) => ({
        ...s,
        instructor: s.instructor_id ? instructorMap.get(s.instructor_id) ?? null : null,
      })),
    assignments: assignments.filter((a) => a.week_id === week.id),
    vocabulary: vocabulary.filter((v) => v.week_id === week.id),
    resources: resources.filter((r) => r.week_id === week.id),
  }));

  // Lead instructor for backward compat
  const lead = instructors.find((i) => i.role === 'lead') ?? instructors[0] ?? null;

  return { ...course, weeks: weeksWithContent, bonusSessions, instructors, instructor: lead?.instructor ?? null };
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

  if (!weeks) {
    const instructors = await getInstructorsForCourse(course.id);
    const lead = instructors.find((i) => i.role === 'lead') ?? instructors[0] ?? null;
    const { data: bonusRaw } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('course_id', course.id)
      .eq('is_bonus', true)
      .order('scheduled_at', { ascending: true, nullsFirst: false });
    const instructorMap = new Map(
      instructors.map((ci) => [ci.instructor_id, ci.instructor]),
    );
    const bonusSessions = (bonusRaw ?? []).map((s) => ({
      ...s,
      instructor: s.instructor_id ? instructorMap.get(s.instructor_id) ?? null : null,
    }));
    return { ...course, weeks: [], bonusSessions, instructors, instructor: lead?.instructor ?? null };
  }

  const weekIds = weeks.map((w) => w.id);

  const [sessionsRes, assignmentsRes, vocabularyRes, resourcesRes, bonusRes, instructors] =
    await Promise.all([
      supabase
        .from('course_sessions')
        .select('*')
        .in('week_id', weekIds)
        .eq('is_bonus', false)
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
      supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', course.id)
        .eq('is_bonus', true)
        .order('scheduled_at', { ascending: true, nullsFirst: false }),
      getInstructorsForCourse(course.id),
    ]);

  // Build instructor lookup for session-level resolution
  const instructorMap = new Map(
    instructors.map((ci) => [ci.instructor_id, ci.instructor]),
  );

  const bonusSessions = (bonusRes.data ?? []).map((s) => ({
    ...s,
    instructor: s.instructor_id ? instructorMap.get(s.instructor_id) ?? null : null,
  }));

  const weeksWithContent: CourseWeekWithContent[] = weeks.map((week) => ({
    ...week,
    sessions: (sessionsRes.data ?? [])
      .filter((s) => s.week_id === week.id)
      .map((s) => ({
        ...s,
        instructor: s.instructor_id ? instructorMap.get(s.instructor_id) ?? null : null,
      })),
    assignments: (assignmentsRes.data ?? []).filter(
      (a) => a.week_id === week.id,
    ),
    vocabulary: (vocabularyRes.data ?? []).filter(
      (v) => v.week_id === week.id,
    ),
    resources: (resourcesRes.data ?? []).filter((r) => r.week_id === week.id),
  }));

  // Lead instructor for backward compat
  const lead = instructors.find((i) => i.role === 'lead') ?? instructors[0] ?? null;

  return { ...course, weeks: weeksWithContent, bonusSessions, instructors, instructor: lead?.instructor ?? null };
}

// Enrolled students roster for admin course view
export async function getEnrolledStudents(courseId: string): Promise<EnrolledStudent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      user_id,
      enrolled_at,
      status,
      users!inner (
        full_name,
        email,
        is_vertice_member
      )
    `)
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false });

  if (error) {
    console.error('[getEnrolledStudents] Query failed:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const user = row.users as Record<string, unknown> | null;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      full_name: (user?.full_name as string) ?? null,
      email: (user?.email as string) ?? null,
      enrolled_at: row.enrolled_at as string,
      status: row.status as string,
      is_vertice_member: (user?.is_vertice_member as boolean) ?? false,
    };
  });
}
