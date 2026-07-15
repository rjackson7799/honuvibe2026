import { createClient } from '@/lib/supabase/server';
import { hawaiiWeekStartUtc } from '@/lib/dates';

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

/**
 * Count of sessions the user marked complete since the start of the current week
 * (Monday 00:00 Pacific/Honolulu — see lib/dates). Backs the resume hero's
 * "this week" rail.
 *
 * The item_type filter is load-bearing: without it this silently counts completed
 * assignments too and the number is simply wrong. `now` is injectable for tests.
 *
 * Throws rather than falling back to 0. This number sits in the resume hero, and
 * a fabricated "Lessons done 0" is exactly the vanity zero this redesign exists
 * to remove — indistinguishable, to the student, from having done nothing.
 */
export async function getLessonsCompletedThisWeek(
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('course_item_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('item_type', 'session')
    .gte('completed_at', hawaiiWeekStartUtc(now).toISOString());
  if (error) throw new Error(error.message);

  return count ?? 0;
}

export interface ResumeCourse {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
}

export interface ResumeSession {
  id: string;
  title_en: string;
  title_jp: string | null;
  duration_minutes: number | null;
}

/**
 * Where the resume hero should point the student.
 *
 * - `resume`      — an unlocked, incomplete session to open. `index` 1 means
 *                   "Start Lesson 1", so a brand-new enrollment needs no state
 *                   of its own.
 * - `caught_up`   — an active course with nothing to do right now: either every
 *                   unlocked session is done and later weeks are still locked, or
 *                   no week has unlocked yet. NOT the same as finishing.
 * - `completed`   — the enrollment itself is 'completed' and no other course has
 *                   a resume target.
 * - `none`        — no eligible enrollment at all.
 *
 * A failed query THROWS rather than returning `none`: degrading a DB failure into
 * "start your first course" would lie to a student who has courses.
 */
export type ResumePoint =
  | {
      kind: 'resume';
      course: ResumeCourse;
      session: ResumeSession;
      index: number;
      total: number;
    }
  | { kind: 'caught_up'; course: ResumeCourse }
  | { kind: 'completed'; course: ResumeCourse }
  | { kind: 'none' };

type EligibleStatus = 'active' | 'completed';
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Order the courses we might resume into, best first:
 * most-recently-opened, then most-recently-progressed, then newest enrolment —
 * preferring an active enrolment over a completed one within each tier.
 */
function orderCandidateCourses(
  tiers: string[][],
  statusByCourse: Map<string, EligibleStatus>,
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const tier of tiers) {
    const fresh: string[] = [];
    for (const courseId of tier) {
      if (seen.has(courseId) || !statusByCourse.has(courseId)) continue;
      seen.add(courseId);
      fresh.push(courseId);
    }
    ordered.push(
      ...fresh.filter((id) => statusByCourse.get(id) === 'active'),
      ...fresh.filter((id) => statusByCourse.get(id) === 'completed'),
    );
  }

  return ordered;
}

type CourseResumeTarget =
  | { kind: 'target'; session: ResumeSession; index: number; total: number }
  | { kind: 'all-complete' }
  | { kind: 'nothing-available' };

/**
 * The first incomplete session of a course, scoped to what the student can
 * actually reach: unlocked weeks only (WeekCard never renders a locked week's
 * sessions, so linking there would dead-end) and no bonus sessions (they sit
 * outside the week sequence and have no session_number).
 *
 * index/total are over unlocked sessions, so "Lesson n of N" matches what's on
 * screen. Ordering is week_number, then session_number, then id as a stable
 * tie-breaker — sorted in memory, mirroring getCoursesProgressMap's week/session
 * join rather than relying on embedded PostgREST ordering.
 */
async function resolveCourseResume(
  supabase: SupabaseServerClient,
  userId: string,
  courseId: string,
): Promise<CourseResumeTarget> {
  // The user's completions don't depend on the weeks, so both go out together.
  const [weeksRes, completionsRes] = await Promise.all([
    supabase
      .from('course_weeks')
      .select('id, week_number')
      .eq('course_id', courseId)
      .eq('is_unlocked', true),
    supabase
      .from('course_item_completions')
      .select('item_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('item_type', 'session'),
  ]);
  if (weeksRes.error) throw new Error(weeksRes.error.message);
  if (completionsRes.error) throw new Error(completionsRes.error.message);

  const weekNumberById = new Map<string, number>();
  for (const w of weeksRes.data ?? []) weekNumberById.set(w.id, w.week_number);
  if (weekNumberById.size === 0) return { kind: 'nothing-available' };

  const { data: sessionRows, error: sessionsError } = await supabase
    .from('course_sessions')
    .select('id, title_en, title_jp, duration_minutes, session_number, week_id')
    .in('week_id', [...weekNumberById.keys()])
    .eq('is_bonus', false);
  if (sessionsError) throw new Error(sessionsError.message);

  const ordered = [...(sessionRows ?? [])].sort((a, b) => {
    const weekDelta =
      (weekNumberById.get(a.week_id) ?? 0) - (weekNumberById.get(b.week_id) ?? 0);
    if (weekDelta !== 0) return weekDelta;
    const numberDelta = (a.session_number ?? 0) - (b.session_number ?? 0);
    if (numberDelta !== 0) return numberDelta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  if (ordered.length === 0) return { kind: 'nothing-available' };

  const done = new Set((completionsRes.data ?? []).map((c) => c.item_id));
  const index = ordered.findIndex((s) => !done.has(s.id));
  if (index === -1) return { kind: 'all-complete' };

  const next = ordered[index];
  return {
    kind: 'target',
    session: {
      id: next.id,
      title_en: next.title_en,
      title_jp: next.title_jp,
      duration_minutes: next.duration_minutes,
    },
    index: index + 1,
    total: ordered.length,
  };
}

/**
 * The single highest-value action for a returning student: which lesson to open
 * next, in which course.
 *
 * Course precedence — most recent session open, then most recent session
 * completion, then newest enrolment (matching getUserEnrollments' enrolled_at
 * DESC). Only 'active'/'completed' enrolments are eligible, the same set
 * requireEnrollment and checkEnrollment accept; refunded/cancelled never surface.
 */
export async function getResumePoint(userId: string): Promise<ResumePoint> {
  const supabase = await createClient();

  const { data: enrollmentRows, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('id, course_id, status')
    .eq('user_id', userId)
    .in('status', ['active', 'completed'])
    .order('enrolled_at', { ascending: false })
    .order('id', { ascending: false });
  if (enrollmentsError) throw new Error(enrollmentsError.message);

  const statusByCourse = new Map<string, EligibleStatus>();
  const enrollmentOrder: string[] = [];
  for (const e of enrollmentRows ?? []) {
    if (!e.course_id || statusByCourse.has(e.course_id)) continue;
    statusByCourse.set(e.course_id, e.status as EligibleStatus);
    enrollmentOrder.push(e.course_id);
  }
  if (enrollmentOrder.length === 0) return { kind: 'none' };

  // Independent of one another once the eligible courses are known — one round
  // trip instead of three, matching getStudentDashboardData's Promise.all.
  const [opensRes, progressRes, coursesRes] = await Promise.all([
    supabase
      .from('course_session_opens')
      .select('course_id, opened_at')
      .eq('user_id', userId)
      .in('course_id', enrollmentOrder)
      .order('opened_at', { ascending: false }),
    supabase
      .from('course_item_completions')
      .select('course_id, completed_at')
      .eq('user_id', userId)
      .eq('item_type', 'session')
      .in('course_id', enrollmentOrder)
      .order('completed_at', { ascending: false }),
    supabase
      .from('courses')
      .select('id, slug, title_en, title_jp')
      .in('id', enrollmentOrder),
  ]);
  if (opensRes.error) throw new Error(opensRes.error.message);
  if (progressRes.error) throw new Error(progressRes.error.message);
  if (coursesRes.error) throw new Error(coursesRes.error.message);

  const courseById = new Map<string, ResumeCourse>();
  for (const c of coursesRes.data ?? []) courseById.set(c.id, c as ResumeCourse);

  const candidates = orderCandidateCourses(
    [
      (opensRes.data ?? []).map((r) => r.course_id),
      (progressRes.data ?? []).map((r) => r.course_id),
      enrollmentOrder,
    ],
    statusByCourse,
  );

  let caughtUp: ResumeCourse | null = null;
  let completed: ResumeCourse | null = null;

  for (const courseId of candidates) {
    const course = courseById.get(courseId);
    // courses_public_read only exposes is_published rows, so an unpublished
    // course the student is enrolled in reads back as missing.
    if (!course) continue;

    const target = await resolveCourseResume(supabase, userId, courseId);
    if (target.kind === 'target') {
      return {
        kind: 'resume',
        course,
        session: target.session,
        index: target.index,
        total: target.total,
      };
    }

    // Nothing to open here — remember it as a fallback and keep looking for a
    // course that does have a next lesson.
    if (statusByCourse.get(courseId) === 'completed') {
      completed ??= course;
    } else {
      caughtUp ??= course;
    }
  }

  if (caughtUp) return { kind: 'caught_up', course: caughtUp };
  if (completed) return { kind: 'completed', course: completed };

  // Eligible enrolments existed (we returned 'none' above otherwise), yet not one
  // resolved to a readable course. That's an anomaly — every course row was
  // hidden or missing — not an empty dashboard. Reporting 'none' here would tell
  // a paying student to "start your first course".
  throw new Error('Enrolled courses could not be resolved');
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
