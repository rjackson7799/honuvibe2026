import { createClient } from '@/lib/supabase/server';

export interface CourseCompletion {
  completedSessionIds: Set<string>;
  completedAssignmentIds: Set<string>;
  sessionsCompleted: number;
  sessionsTotal: number;
  percent: number;
}

/**
 * Real per-course completion for one user: which session/assignment items are
 * done, plus the sessions-only progress percent (assignments are tracked but
 * are not part of the completion gate).
 *
 * Reads the user's own completion rows (RLS-scoped) + a count of the course's
 * sessions. `percent` is 0 for a course with no sessions (never divides by zero).
 */
export async function getCourseCompletion(
  userId: string,
  courseId: string,
): Promise<CourseCompletion> {
  const supabase = await createClient();

  const { data: completions } = await supabase
    .from('course_item_completions')
    .select('item_type, item_id')
    .eq('user_id', userId)
    .eq('course_id', courseId);

  const completedSessionIds = new Set<string>();
  const completedAssignmentIds = new Set<string>();
  for (const c of completions ?? []) {
    if (c.item_type === 'session') completedSessionIds.add(c.item_id);
    else if (c.item_type === 'assignment') completedAssignmentIds.add(c.item_id);
  }

  const sessionsTotal = await countCourseSessions(courseId);
  const sessionsCompleted = completedSessionIds.size;
  const percent =
    sessionsTotal === 0
      ? 0
      : Math.min(100, Math.round((sessionsCompleted / sessionsTotal) * 100));

  return {
    completedSessionIds,
    completedAssignmentIds,
    sessionsCompleted,
    sessionsTotal,
    percent,
  };
}

/**
 * Batched sessions-completion percent per course for the dashboard "My Courses"
 * cards. Avoids N+1: one read of the user's session completions across all
 * courses, one read of the courses' session totals, computed in memory.
 */
export async function getCoursesProgressMap(
  userId: string,
  courseIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (courseIds.length === 0) return map;

  const supabase = await createClient();

  // Completed sessions per course (user's own rows).
  const { data: completions } = await supabase
    .from('course_item_completions')
    .select('course_id, item_id')
    .eq('user_id', userId)
    .eq('item_type', 'session')
    .in('course_id', courseIds);

  const completedByCourse = new Map<string, Set<string>>();
  for (const c of completions ?? []) {
    let set = completedByCourse.get(c.course_id);
    if (!set) {
      set = new Set<string>();
      completedByCourse.set(c.course_id, set);
    }
    set.add(c.item_id);
  }

  // Total sessions per course, via the courses' weeks.
  const { data: weekRows } = await supabase
    .from('course_weeks')
    .select('id, course_id')
    .in('course_id', courseIds);

  const weekToCourse = new Map<string, string>();
  const weekIds: string[] = [];
  for (const w of weekRows ?? []) {
    weekToCourse.set(w.id, w.course_id);
    weekIds.push(w.id);
  }

  const totalByCourse = new Map<string, number>();
  if (weekIds.length > 0) {
    const { data: sessionRows } = await supabase
      .from('course_sessions')
      .select('id, week_id')
      .in('week_id', weekIds);
    for (const s of sessionRows ?? []) {
      const courseId = weekToCourse.get(s.week_id);
      if (!courseId) continue;
      totalByCourse.set(courseId, (totalByCourse.get(courseId) ?? 0) + 1);
    }
  }

  for (const courseId of courseIds) {
    const total = totalByCourse.get(courseId) ?? 0;
    const done = completedByCourse.get(courseId)?.size ?? 0;
    const percent =
      total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
    map.set(courseId, percent);
  }

  return map;
}

/**
 * Lifetime count of sessions the user has marked complete, across all courses.
 * Backs the dashboard's "Sessions Completed" stat.
 */
export async function getSessionsCompletedCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('course_item_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('item_type', 'session');

  return count ?? 0;
}

/** Count of sessions belonging to a course, via its weeks. */
async function countCourseSessions(courseId: string): Promise<number> {
  const supabase = await createClient();

  const { data: weekRows } = await supabase
    .from('course_weeks')
    .select('id')
    .eq('course_id', courseId);

  const weekIds = (weekRows ?? []).map((w) => w.id);
  if (weekIds.length === 0) return 0;

  const { count } = await supabase
    .from('course_sessions')
    .select('id', { count: 'exact', head: true })
    .in('week_id', weekIds);

  return count ?? 0;
}
