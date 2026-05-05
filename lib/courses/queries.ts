import { createClient } from '@/lib/supabase/server';
import { getInstructorsForCourse } from '@/lib/instructors/queries';
import type {
  Course,
  CourseWithCurriculum,
  CourseWeekWithContent,
  CourseWithPartner,
  PartnerSlim,
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

export async function getPublishedCoursesWithPartners(
  ownerSlug?: string | null,
): Promise<CourseWithPartner[]> {
  const supabase = await createClient();

  let query = supabase
    .from('courses')
    .select(
      `id, slug, course_id_code, course_type, title_en, title_jp,
       description_en, description_jp, instructor_name, instructor_id,
       price_usd, price_jpy, instructor_revenue_share_pct, language,
       subtitle_language, level, format, start_date, end_date,
       total_weeks, live_sessions_count, recorded_lessons_count,
       max_enrollment, current_enrollment, learning_outcomes_en,
       learning_outcomes_jp, prerequisites_en, prerequisites_jp,
       who_is_for_en, who_is_for_jp, tools_covered, community_platform,
       community_duration_months, community_link, zoom_link,
       schedule_notes_en, schedule_notes_jp, cancellation_policy_en,
       cancellation_policy_jp, completion_requirements_en,
       completion_requirements_jp, materials_summary_en, materials_summary_jp,
       thumbnail_url, hero_image_url, tags, is_featured, is_published,
       is_private, status, esl_enabled, esl_included, esl_price_usd,
       esl_price_jpy, esl_settings_json, free_preview_count,
       syllabus_url_en, syllabus_url_jp, partner_id,
       proposed_by_instructor_id, proposal_submitted_at,
       proposal_review_notes, created_at, updated_at,
       partners!courses_partner_id_fkey ( slug, name_en, name_jp, logo_url )`,
    )
    .eq('is_published', true)
    .eq('is_private', false);

  if (ownerSlug === 'honuvibe') {
    query = query.is('partner_id', null);
  } else if (ownerSlug) {
    // Resolve partner slug → id, then filter
    const partnerClient = await createClient();
    const { data: p } = await partnerClient
      .from('partners')
      .select('id')
      .eq('slug', ownerSlug)
      .maybeSingle();
    if (p) {
      query = query.eq('partner_id', p.id);
    }
    // Unknown slug: leave unfiltered (silently ignore)
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  // Normalise the FK join result: Supabase may return the relation as an
  // array (one-to-many) even though partner_id is a to-one FK. Flatten it.
  return (data ?? []).map((row) => {
    const rawPartner = (row as Record<string, unknown>).partners;
    const partner = Array.isArray(rawPartner)
      ? (rawPartner[0] ?? null)
      : rawPartner ?? null;
    return { ...(row as Course), partners: partner } as CourseWithPartner;
  });
}

export async function getActivePublicPartners(): Promise<PartnerSlim[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('partners')
    .select('slug, name_en, name_jp')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('name_en');

  if (error) {
    // Non-fatal — chips just won't appear
    console.error('[getActivePublicPartners]', error);
    return [];
  }
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
