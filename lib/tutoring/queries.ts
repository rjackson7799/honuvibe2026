import { createClient } from '@/lib/supabase/server';
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

/** ADMIN: every 1v1 course as an engagement summary (student + report stats). */
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
    };
  });
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

/** ADMIN: a single 1v1 course + its (single) active enrollee. */
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

/** ADMIN: one course's reports, all statuses, newest first. */
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

/** ADMIN: a single report joined with its instructor-only private child. */
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

/** ADMIN: accumulated recurring patterns for a student in a course. */
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
