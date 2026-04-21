import { createClient, createAdminClient } from '@/lib/supabase/server';
import type {
  DashboardStats,
  StudentListItem,
  StudentDetail,
  Application,
  RevenueStats,
  TransactionRecord,
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
    .select('id, email, full_name, subscription_status, subscription_tier, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const studentIds = (students ?? []).map((s) => s.id);

  // Fetch enrollments
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

  // Fetch survey assignments (most recent per student)
  const { data: surveyAssignments } = await supabase
    .from('survey_assignments')
    .select('user_id, status')
    .in('user_id', studentIds)
    .order('assigned_at', { ascending: false });

  const surveyStatusMap = new Map<string, 'pending' | 'completed'>();
  for (const sa of surveyAssignments ?? []) {
    if (!surveyStatusMap.has(sa.user_id)) {
      surveyStatusMap.set(sa.user_id, sa.status as 'pending' | 'completed');
    }
  }

  return (students ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    enrolled_courses: enrollmentMap.get(s.id) ?? [],
    subscription_status: s.subscription_status ?? 'none',
    subscription_tier: s.subscription_tier ?? 'free',
    survey_status: surveyStatusMap.get(s.id) ?? null,
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

  // Fetch email confirmation status from auth.users (not available in public.users)
  const adminClient = createAdminClient();
  const { data: authUser } = await adminClient.auth.admin.getUserById(studentId);
  const emailConfirmedAt = authUser?.user?.email_confirmed_at ?? null;

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id, status, amount_paid, currency, enrolled_at, course:courses(title_en)')
    .eq('user_id', studentId)
    .order('enrolled_at', { ascending: false });

  return {
    ...student,
    email_confirmed_at: emailConfirmedAt,
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

export async function getRevenueStats(): Promise<RevenueStats> {
  const supabase = await createClient();

  // Total revenue by currency
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount, currency')
    .eq('status', 'succeeded');

  let total_usd = 0;
  let total_jpy = 0;
  for (const p of allPayments ?? []) {
    if (p.currency === 'usd') total_usd += p.amount;
    else if (p.currency === 'jpy') total_jpy += p.amount;
  }

  // This month's revenue
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthPayments } = await supabase
    .from('payments')
    .select('amount, currency')
    .eq('status', 'succeeded')
    .gte('created_at', monthStart.toISOString());

  let month_usd = 0;
  let month_jpy = 0;
  for (const p of monthPayments ?? []) {
    if (p.currency === 'usd') month_usd += p.amount;
    else if (p.currency === 'jpy') month_jpy += p.amount;
  }

  // Active subscribers
  const { count: active_subscribers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active');

  // Active enrollments
  const { count: active_enrollments } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  return {
    total_usd,
    total_jpy,
    month_usd,
    month_jpy,
    active_subscribers: active_subscribers ?? 0,
    active_enrollments: active_enrollments ?? 0,
  };
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*, user:users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((p) => {
    const user = p.user as unknown as { full_name: string | null; email: string | null } | null;
    return {
      id: p.id,
      user_name: user?.full_name ?? null,
      user_email: user?.email ?? null,
      type: p.type,
      description: p.description,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      receipt_url: p.receipt_url,
      created_at: p.created_at,
    };
  });
}

export interface ActiveCourse {
  id: string;
  title_en: string;
  title_jp: string | null;
}

export async function getActiveCourses(): Promise<ActiveCourse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('id, title_en, title_jp')
    .in('status', ['published', 'in-progress'])
    .order('title_en', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export interface ActiveSurvey {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string;
}

export async function getActiveSurveys(): Promise<ActiveSurvey[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('surveys')
    .select('id, slug, title_en, title_jp')
    .eq('is_active', true)
    .order('title_en', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export interface ActivePartner {
  id: string;
  slug: string;
  name_en: string;
}

export async function getActivePartners(): Promise<ActivePartner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('partners')
    .select('id, slug, name_en')
    .eq('is_active', true)
    .order('name_en', { ascending: true });

  if (error) {
    console.error('[getActivePartners] failed:', error);
    return [];
  }
  return data ?? [];
}
