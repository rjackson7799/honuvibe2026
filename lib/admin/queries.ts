import { createClient } from '@/lib/supabase/server';
import type {
  DashboardStats,
  StudentListItem,
  StudentDetail,
  Application,
} from './types';

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  // Active courses
  const { count: activeCourses } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .in('status', ['published', 'in-progress']);

  // Total enrolled
  const { count: totalEnrolled } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Spots remaining per active course
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title_en, max_enrollment, current_enrollment')
    .in('status', ['published', 'in-progress']);

  const spotsRemaining = (coursesData ?? []).map((c) => ({
    course_id: c.id,
    course_title: c.title_en,
    remaining: (c.max_enrollment ?? 0) - (c.current_enrollment ?? 0),
  }));

  // Upcoming sessions (next 7 days)
  const now = new Date().toISOString();
  const weekFromNow = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: upcomingSessions } = await supabase
    .from('course_sessions')
    .select(
      'id, title_en, scheduled_at, week_id',
    )
    .gte('scheduled_at', now)
    .lte('scheduled_at', weekFromNow)
    .eq('status', 'upcoming')
    .order('scheduled_at', { ascending: true })
    .limit(5);

  // Recent enrollments (last 7 days)
  const weekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: recentEnrollments } = await supabase
    .from('enrollments')
    .select('id, enrolled_at, user:users(full_name), course:courses(title_en)')
    .gte('enrolled_at', weekAgo)
    .order('enrolled_at', { ascending: false })
    .limit(5);

  // Pending applications
  const { count: pendingApps } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'received');

  return {
    active_courses: activeCourses ?? 0,
    total_enrolled: totalEnrolled ?? 0,
    spots_remaining: spotsRemaining,
    upcoming_sessions: (upcomingSessions ?? []).map((s) => ({
      id: s.id,
      title_en: s.title_en,
      scheduled_at: s.scheduled_at ?? '',
      course_title: '', // Would need a join through weeks
    })),
    recent_enrollments: (recentEnrollments ?? []).map((e) => {
      const user = e.user as unknown as { full_name: string } | null;
      const course = e.course as unknown as { title_en: string } | null;
      return {
        id: e.id,
        user_name: user?.full_name ?? 'Unknown',
        course_title: course?.title_en ?? 'Unknown',
        enrolled_at: e.enrolled_at,
      };
    }),
    pending_applications: pendingApps ?? 0,
  };
}

export async function getStudentList(): Promise<StudentListItem[]> {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from('users')
    .select('id, email, full_name, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get enrollments for each student
  const studentIds = (students ?? []).map((s) => s.id);
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id, course:courses(title_en)')
    .in('user_id', studentIds)
    .eq('status', 'active');

  const enrollmentMap = new Map<string, string[]>();
  for (const e of enrollments ?? []) {
    const course = e.course as unknown as { title_en: string } | null;
    const courseTitle = course?.title_en ?? '';
    const existing = enrollmentMap.get(e.user_id) ?? [];
    existing.push(courseTitle);
    enrollmentMap.set(e.user_id, existing);
  }

  return (students ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    enrolled_courses: enrollmentMap.get(s.id) ?? [],
    created_at: s.created_at,
  }));
}

export async function getStudentDetail(
  studentId: string,
): Promise<StudentDetail | null> {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from('users')
    .select('*')
    .eq('id', studentId)
    .single();

  if (!student) return null;

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id, status, amount_paid, currency, enrolled_at, course:courses(title_en)')
    .eq('user_id', studentId)
    .order('enrolled_at', { ascending: false });

  return {
    ...student,
    enrollments: (enrollments ?? []).map((e) => {
      const course = e.course as unknown as { title_en: string } | null;
      return {
        id: e.id,
        course_id: e.course_id,
        course_title: course?.title_en ?? '',
        status: e.status,
        amount_paid: e.amount_paid,
        currency: e.currency,
        enrolled_at: e.enrolled_at,
      };
    }),
  };
}

export async function getApplications(
  status?: string,
): Promise<Application[]> {
  const supabase = await createClient();

  let query = supabase
    .from('applications')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
