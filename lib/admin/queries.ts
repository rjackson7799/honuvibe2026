import { createClient, createAdminClient } from '@/lib/supabase/server';
import { findEngagementForLead } from '@/lib/studio/engagement/queries';
import type { EngagementStage } from '@/lib/studio/engagement/stages';
import type {
  DashboardStats,
  StudentListItem,
  StudentDetail,
  Application,
  PartnershipInquiry,
  Feedback,
  StudioLead,
  StudioLeadDetail,
  LeadAudit,
  Prospect,
  ProspectStatus,
  Engagement,
  EngagementBrief,
  EngagementEvent,
  EngagementListItem,
  EngagementRef,
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

export async function getPartnershipInquiries(
  status?: string,
): Promise<PartnershipInquiry[]> {
  const supabase = await createClient();

  let query = supabase
    .from('partnership_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (
    error?.code === 'PGRST205' &&
    error.message?.includes("table 'public.partnership_inquiries'")
  ) {
    console.error(
      '[getPartnershipInquiries] partnership_inquiries table is missing. Apply supabase/migrations/034_partnership_inquiries.sql to restore the admin inbox.',
    );
    return [];
  }
  if (error) throw error;
  return data ?? [];
}

export async function getFeedback(status?: string): Promise<Feedback[]> {
  const supabase = await createClient();

  // Disambiguate the embed: `feedback` has TWO FKs to users (user_id and
  // reviewed_by), so an unqualified `users(...)` embed errors with PGRST201.
  // The `!user_id` hint selects the submitter relationship.
  let query = supabase
    .from('feedback')
    .select('*, users!user_id(full_name, email)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error?.code === 'PGRST205' && error.message?.includes("table 'public.feedback'")) {
    console.error(
      '[getFeedback] feedback table is missing. Apply supabase/migrations/059_feedback.sql to restore the admin inbox.',
    );
    return [];
  }
  if (error) throw error;
  return (data ?? []) as unknown as Feedback[];
}

export async function getStudioLeads(status?: string): Promise<StudioLead[]> {
  const supabase = await createClient();

  // Reads from the normalized `leads` table (migration 047) — the discovery
  // engine's source of truth — not the retired flat `studio_leads`. Column
  // aliasing maps leads → the StudioLead shape so the admin UI is unchanged;
  // the `status` filter targets the admin-managed `sales_stage`. New discover
  // and studio-form leads both appear here. (Lifecycle + full discovery answers
  // arrive with the later admin-UI upgrade.)
  let query = supabase
    .from('leads')
    .select(
      'id, created_at, full_name:name, company:business_name, ' +
        'project_type:tier_interest, status:sales_stage, email, industry, ' +
        'budget_range, timeline, referral_source, source_locale, message, ' +
        'notes, phone, existing_url, source, reviewed_by, reviewed_at, ' +
        // The lead's engagement (067) for the list row's "Engaged" dot + link.
        'engagement:engagements(id, lead_id, stage)',
    )
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('sales_stage', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  // Cast: the aliased select maps leads → the StudioLead shape at the DB layer,
  // but the supabase-js type parser only infers string-literal selects (ours is
  // concatenated), so it can't see the aliases. Runtime shape is correct.
  // PostgREST returns a to-one embed as an object when it detects the UNIQUE
  // on engagements.lead_id, and as an array otherwise — normalise both.
  return ((data ?? []) as unknown as (StudioLead & { engagement: unknown })[]).map((row) => {
    const raw = row.engagement;
    const engagement = (Array.isArray(raw) ? raw[0] ?? null : raw ?? null) as EngagementRef | null;
    return { ...row, engagement };
  });
}

/**
 * A single lead by id for the workspace detail page — same aliasing as
 * getStudioLeads plus the workspace-only columns (migration 056). Returns null
 * when the row does not exist. The aliased select keeps the UI vocabulary
 * (full_name/company/status/project_type) in sync with StudioLeadDetail; the DB
 * column names live only in lib/studio/lead-actions.ts.
 */
export async function getStudioLeadById(
  id: string,
): Promise<StudioLeadDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, created_at, updated_at, full_name:name, company:business_name, ' +
        'project_type:tier_interest, status:sales_stage, email, industry, ' +
        'budget_range, timeline, referral_source, source_locale, message, ' +
        'notes, phone, existing_url, source, reviewed_by, reviewed_at, ' +
        'preview_url, preview_password, outreach_email_subject, ' +
        'outreach_email_body, outreach_email_generated_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  // Same concatenated-select cast rationale as getStudioLeads above.
  return data as unknown as StudioLeadDetail;
}

// Website audits for a lead (migration 060). Uses createClient() (session/RLS)
// to match getStudioLeadById — the GET route holds an admin session and
// lead_audits_admin_all lets it through. Errors are THROWN, never swallowed: an
// RLS error / missing migration / dropped connection must surface as a logged
// 500, not a silent "no audits yet". Only a successful empty result is [].
export type LeadAuditSummary =
  Pick<LeadAudit, 'id' | 'created_at' | 'status'> & { overall: number | null };

export async function getLeadAudits(leadId: string, limit = 20): Promise<LeadAudit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lead_audits')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as LeadAudit[];
}

// Lightweight single-row read for the ~5s poll (no full-history JSONB churn).
export async function getLatestLeadAudit(leadId: string): Promise<LeadAudit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lead_audits')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as LeadAudit | null;
}

// Prospect Finder (migration 061). Same throw-on-error rule as getLeadAudits:
// a query error is a logged 500, never a silent []. Top 200 by opportunity
// score; dismissed rows are EXCLUDED unless explicitly requested via the
// status filter. `search` is sanitized to [\w\s-] (max 80) before interpolation
// into .or() — PostgREST filter grammar treats commas, parens, and quotes as
// syntax, so stripping only %/_ is not enough.
export async function getProspects(filters?: {
  status?: ProspectStatus;
  search?: string;
  limit?: number; // default 200
}): Promise<Prospect[]> {
  const supabase = await createClient();
  let query = supabase
    .from('prospects')
    .select('*')
    .order('score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 200);
  if (filters?.status) query = query.eq('status', filters.status);
  else query = query.neq('status', 'dismissed');
  const s = filters?.search?.replace(/[^\w\s-]/g, '').trim().slice(0, 80);
  if (s) {
    query = query.or(`name.ilike.%${s}%,industry.ilike.%${s}%,location.ilike.%${s}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Prospect[];
}

// Unfiltered in-flight count — the panel's poll-completion signal. Independent
// of list filters/limit so polling can never stop early because active rows
// fell outside the visible top-200 or a filter hid them.
export async function getScoringCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scoring');
  if (error) throw error;
  return count ?? 0;
}

// Studio engagement spine (migration 067). Same throw-on-error rule as
// getProspects: a query error is a logged 500, never a silent []. The list
// reads the engagement_list view, which pre-aggregates the discovery progress
// counts, last activity and open attention in SQL — no N+1 in the page.
export async function getEngagements(filters?: {
  stage?: EngagementStage;
}): Promise<EngagementListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from('engagement_list')
    .select('*')
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (filters?.stage) query = query.eq('stage', filters.stage);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as EngagementListItem[];
}

/** One engagement for the workspace page; null when the row does not exist. */
export async function getEngagementById(id: string): Promise<Engagement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Engagement | null;
}

/** The engagement a lead owns (for the lead workspace's frozen badge + Start button). */
export async function getEngagementForLead(leadId: string): Promise<EngagementRef | null> {
  const supabase = await createClient();
  return findEngagementForLead(supabase, leadId);
}

export async function getEngagementEvents(
  engagementId: string,
  limit = 200,
): Promise<EngagementEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('engagement_events')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as EngagementEvent[];
}

export async function getEngagementBriefs(
  engagementId: string,
  limit = 20,
): Promise<EngagementBrief[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('engagement_briefs')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as EngagementBrief[];
}

// Lightweight single-row read for the brief panel's poll (slice 2).
export async function getLatestEngagementBrief(
  engagementId: string,
): Promise<EngagementBrief | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('engagement_briefs')
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as EngagementBrief | null;
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
  course_id: string | null;
  kind: 'course' | 'event';
}

/**
 * Active COURSE surveys for the add-student picker. Filters out event surveys
 * (kind='event') so they never leak into student assignment; returns course_id
 * so the UI can show only the selected course's survey (+ unbound legacy ones).
 */
export async function getActiveSurveys(): Promise<ActiveSurvey[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('surveys')
    .select('id, slug, title_en, title_jp, course_id, kind')
    .eq('is_active', true)
    .eq('kind', 'course')
    .order('title_en', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ActiveSurvey[];
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
