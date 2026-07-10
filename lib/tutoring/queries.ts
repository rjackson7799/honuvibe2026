import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SessionReport,
  SessionReportPrivate,
  SessionReportWithPrivate,
  StudentPattern,
  TutoringCourseSummary,
} from './types';

// ============================================================
// Reads for the 1v1 session-companion. Student reads are RLS-scoped to the
// caller; admin reads run in AdminGuard-protected server components (the admin
// JWT satisfies is_admin() RLS on the private/pattern tables).
// ============================================================

const REPORT_COLUMNS =
  'id, course_id, student_id, session_date, topic, duration_minutes, status, student_json, published_at, patterns_applied_at, created_by, created_at, updated_at';

/**
 * STUDENT: published reports for a course, newest first. RLS already restricts
 * to the caller's own published rows; student_id is passed for explicit
 * defense-in-depth.
 */
export async function getPublishedReportsForStudent(
  courseId: string,
  studentId: string,
): Promise<SessionReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('session_reports')
    .select(REPORT_COLUMNS)
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .eq('status', 'published')
    .order('session_date', { ascending: false });
  return (data ?? []) as SessionReport[];
}

type EnrollmentRow = {
  course_id: string;
  user_id: string;
  users: { id: string; full_name: string | null; email: string | null } | null;
};

// A course_instructors row joined to its instructor_profiles, used to resolve
// the assigned (lead) teacher for a batch of courses. Cast via `as unknown`
// like EnrollmentRow above — this client has no generated Database types.
type CourseInstructorTeacherRow = {
  course_id: string;
  instructor_id: string;
  role: string;
  instructor_profiles: { id: string; display_name: string } | null;
};

type MinimalCourseRow = { id: string; slug: string; title_en: string };

/**
 * Shared aggregation for both list1v1Courses (admin) and
 * listMyTutoringEngagements (instructor): given a batch of 1v1 course rows,
 * attach each course's active enrollment (student) and report stats
 * (count + last session date). Teacher fields are left null here — callers
 * that know the assignment (a batch join for admin, or the caller's own
 * identity for the instructor list) fill them in afterward. Do not
 * copy-paste this block; extend it if a third caller needs the same shape.
 */
async function buildEngagementSummaries(
  courseRows: MinimalCourseRow[],
  supabase: SupabaseClient,
): Promise<TutoringCourseSummary[]> {
  if (courseRows.length === 0) return [];
  const courseIds = courseRows.map((c) => c.id);

  const { data: enrData } = await supabase
    .from('enrollments')
    .select('course_id, user_id, users!inner(id, full_name, email)')
    .in('course_id', courseIds)
    .eq('status', 'active');
  const enrollments = (enrData ?? []) as unknown as EnrollmentRow[];

  const { data: reportData } = await supabase
    .from('session_reports')
    .select('course_id, session_date')
    .in('course_id', courseIds);

  const enrollByCourse = new Map<string, EnrollmentRow>();
  for (const e of enrollments) {
    if (!enrollByCourse.has(e.course_id)) enrollByCourse.set(e.course_id, e);
  }

  const statsByCourse = new Map<string, { count: number; last: string | null }>();
  for (const r of (reportData ?? []) as { course_id: string; session_date: string }[]) {
    const s = statsByCourse.get(r.course_id) ?? { count: 0, last: null };
    s.count += 1;
    if (!s.last || r.session_date > s.last) s.last = r.session_date;
    statsByCourse.set(r.course_id, s);
  }

  return courseRows.map((c) => {
    const student = enrollByCourse.get(c.id)?.users ?? null;
    const stats = statsByCourse.get(c.id) ?? { count: 0, last: null };
    return {
      courseId: c.id,
      slug: c.slug,
      titleEn: c.title_en,
      studentId: student?.id ?? null,
      studentName: student?.full_name ?? null,
      studentEmail: student?.email ?? null,
      reportCount: stats.count,
      lastSessionDate: stats.last,
      teacherName: null,
      teacherProfileId: null,
    };
  });
}

/**
 * ADMIN: every 1v1 course as an engagement summary (student + report stats +
 * assigned teacher). course_instructors is read via the user-scoped client —
 * `course_instructors_public_read` (015_multi_instructor.sql) already covers
 * this because every 1v1 engagement is created with is_published = true
 * (lib/tutoring/actions.ts), and `course_instructors_admin_all` covers it
 * regardless; matches the client choice used throughout lib/instructors/queries.ts.
 */
export async function list1v1Courses(): Promise<TutoringCourseSummary[]> {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title_en, created_at')
    .eq('course_type', '1v1')
    .order('created_at', { ascending: false });

  const courseRows = courses ?? [];
  if (courseRows.length === 0) return [];
  const courseIds = courseRows.map((c) => c.id);

  const summaries = await buildEngagementSummaries(courseRows, supabase);

  const { data: ciData } = await supabase
    .from('course_instructors')
    .select('course_id, instructor_id, role, instructor_profiles!inner(id, display_name)')
    .in('course_id', courseIds);
  const courseInstructorRows = (ciData ?? []) as unknown as CourseInstructorTeacherRow[];

  // An engagement has at most one row in practice (one lead teacher). If more
  // than one somehow exists, prefer the 'lead' row.
  const teacherByCourse = new Map<string, { teacherProfileId: string; teacherName: string | null }>();
  for (const ci of courseInstructorRows) {
    const existing = teacherByCourse.get(ci.course_id);
    if (!existing || ci.role === 'lead') {
      teacherByCourse.set(ci.course_id, {
        teacherProfileId: ci.instructor_id,
        teacherName: ci.instructor_profiles?.display_name ?? null,
      });
    }
  }

  return summaries.map((s) => {
    const teacher = teacherByCourse.get(s.courseId);
    return {
      ...s,
      teacherProfileId: teacher?.teacherProfileId ?? null,
      teacherName: teacher?.teacherName ?? null,
    };
  });
}

/**
 * INSTRUCTOR: this teacher's own 1v1 engagements, same TutoringCourseSummary
 * shape as list1v1Courses. Explicit filtering via course_instructors is
 * REQUIRED — courses_public_read (001_phase2_schema.sql) exposes every
 * published course row, so RLS alone cannot scope the course list to this
 * instructor.
 *
 * Uses the user-scoped client throughout (no admin client needed):
 * - course_instructors / courses: readable via their public-read policies,
 *   since every 1v1 engagement is created with is_published = true
 *   (lib/tutoring/actions.ts) — same as list1v1Courses above.
 * - enrollments / session_reports / users (joined inside
 *   buildEngagementSummaries): granted to the assigned instructor by
 *   migration 058's `enrollments_1v1_instructor_read`,
 *   `session_reports_instructor_read`, and `users_1v1_instructor_read`
 *   policies.
 * - instructor_profiles: readable via `instructor_profiles_public_read`
 *   (004_instructor_management.sql, is_active = true).
 */
export async function listMyTutoringEngagements(
  instructorProfileId: string,
): Promise<TutoringCourseSummary[]> {
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('course_instructors')
    .select('course_id')
    .eq('instructor_id', instructorProfileId);
  const courseIds = (links ?? []).map((l) => l.course_id as string);
  if (courseIds.length === 0) return [];

  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title_en, created_at')
    .in('id', courseIds)
    .eq('course_type', '1v1')
    .order('created_at', { ascending: false });

  const courseRows = courses ?? [];
  if (courseRows.length === 0) return [];

  const { data: profile } = await supabase
    .from('instructor_profiles')
    .select('display_name')
    .eq('id', instructorProfileId)
    .maybeSingle();

  const summaries = await buildEngagementSummaries(courseRows, supabase);
  return summaries.map((s) => ({
    ...s,
    teacherProfileId: instructorProfileId,
    teacherName: profile?.display_name ?? null,
  }));
}

export interface TutoringCourseDetail {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    locale_preference: string | null;
  } | null;
}

/**
 * ADMIN or assigned instructor (RLS-scoped via migration 058; callers must
 * still gate with lib/tutoring/auth): a single 1v1 course + its (single)
 * active enrollee.
 */
export async function getTutoringCourse(courseId: string): Promise<TutoringCourseDetail | null> {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title_en, title_jp, course_type')
    .eq('id', courseId)
    .maybeSingle();
  if (!course || course.course_type !== '1v1') return null;

  const { data: enrData } = await supabase
    .from('enrollments')
    .select('user_id, users!inner(id, full_name, email, locale_preference)')
    .eq('course_id', courseId)
    .eq('status', 'active')
    .limit(1);
  const enrollment = (enrData ?? []) as unknown as {
    users: {
      id: string;
      full_name: string | null;
      email: string | null;
      locale_preference: string | null;
    } | null;
  }[];

  return {
    id: course.id,
    slug: course.slug,
    title_en: course.title_en,
    title_jp: course.title_jp,
    student: enrollment[0]?.users ?? null,
  };
}

/**
 * ADMIN or assigned instructor (RLS-scoped via migration 058; callers must
 * still gate with lib/tutoring/auth): one course's reports, all statuses,
 * newest first.
 */
export async function getReportsForCourse(courseId: string): Promise<SessionReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('session_reports')
    .select(REPORT_COLUMNS)
    .eq('course_id', courseId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false });
  return (data ?? []) as SessionReport[];
}

/**
 * ADMIN or assigned instructor (RLS-scoped via migration 058; callers must
 * still gate with lib/tutoring/auth): a single report joined with its
 * instructor-only private child.
 */
export async function getReportForAdmin(reportId: string): Promise<SessionReportWithPrivate | null> {
  const supabase = await createClient();
  const { data: report } = await supabase
    .from('session_reports')
    .select(REPORT_COLUMNS)
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return null;

  const { data: priv } = await supabase
    .from('session_report_private')
    .select('report_id, transcript_ref, source_image_refs, margin_notes, instructor_json, generation_error, model_id, reviewed_by, reviewed_at, updated_at')
    .eq('report_id', reportId)
    .maybeSingle();

  return {
    ...(report as SessionReport),
    private: (priv as SessionReportPrivate | null) ?? null,
  };
}

/**
 * ADMIN or assigned instructor (RLS-scoped via migration 058; callers must
 * still gate with lib/tutoring/auth): accumulated recurring patterns for a
 * student in a course.
 */
export async function getPatternsForStudent(
  courseId: string,
  studentId: string,
): Promise<StudentPattern[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('student_patterns')
    .select('*')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .order('occurrence_count', { ascending: false })
    .order('last_seen_on', { ascending: false, nullsFirst: false });
  return (data ?? []) as StudentPattern[];
}
