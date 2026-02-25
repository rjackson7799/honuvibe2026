import { createClient } from '@/lib/supabase/server';
import { getUserEnrollments } from '@/lib/enrollments/queries';
import type {
  StudentDashboardData,
  UpcomingSessionItem,
  PendingAssignmentItem,
  StudentStats,
  CommunityLink,
  ContentItemForStudent,
  ContentCollectionForStudent,
} from './types';
import type { UserProfile } from '@/lib/admin/types';

export async function getStudentDashboardData(
  userId: string,
): Promise<StudentDashboardData> {
  const [enrollments, upcomingSessions, pendingAssignments] = await Promise.all([
    getUserEnrollments(userId),
    getUpcomingSessionsForStudent(userId),
    getPendingAssignmentsForStudent(userId),
  ]);

  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const completedCount = enrollments.filter((e) => e.status === 'completed').length;

  // Calculate total study hours from session durations
  const totalMinutes = upcomingSessions.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0,
  );

  const stats: StudentStats = {
    active_courses: activeCount,
    completed_courses: completedCount,
    upcoming_sessions_count: upcomingSessions.length,
    total_study_hours: Math.round(totalMinutes / 60),
  };

  return {
    enrollments,
    upcomingSessions,
    pendingAssignments,
    stats,
  };
}

export async function getUpcomingSessionsForStudent(
  userId: string,
): Promise<UpcomingSessionItem[]> {
  const supabase = await createClient();

  // Get enrolled course IDs
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.course_id);

  // Get courses for slug/title lookup
  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title_en, title_jp')
    .in('id', courseIds);

  const courseMap = new Map(
    (courses ?? []).map((c) => [c.id, c]),
  );

  // Get all weeks for enrolled courses
  const { data: weeks } = await supabase
    .from('course_weeks')
    .select('id, course_id, week_number')
    .in('course_id', courseIds);

  if (!weeks || weeks.length === 0) return [];

  const weekIds = weeks.map((w) => w.id);
  const weekMap = new Map(
    weeks.map((w) => [w.id, w]),
  );

  // Get upcoming sessions
  const now = new Date().toISOString();
  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('*')
    .in('week_id', weekIds)
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  return (sessions ?? []).map((s) => {
    const week = weekMap.get(s.week_id);
    const course = week ? courseMap.get(week.course_id) : null;
    return {
      id: s.id,
      title_en: s.title_en,
      title_jp: s.title_jp,
      format: s.format,
      scheduled_at: s.scheduled_at!,
      zoom_link: s.zoom_link,
      replay_url: s.replay_url,
      duration_minutes: s.duration_minutes,
      status: s.status,
      course_title_en: course?.title_en ?? '',
      course_title_jp: course?.title_jp ?? null,
      course_slug: course?.slug ?? '',
      week_number: week?.week_number ?? 0,
    };
  });
}

export async function getPendingAssignmentsForStudent(
  userId: string,
): Promise<PendingAssignmentItem[]> {
  const supabase = await createClient();

  // Get enrolled course IDs
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.course_id);

  // Get courses for slug/title lookup
  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title_en, title_jp')
    .in('id', courseIds);

  const courseMap = new Map(
    (courses ?? []).map((c) => [c.id, c]),
  );

  // Get unlocked weeks for enrolled courses
  const { data: weeks } = await supabase
    .from('course_weeks')
    .select('id, course_id, week_number')
    .in('course_id', courseIds)
    .eq('is_unlocked', true);

  if (!weeks || weeks.length === 0) return [];

  const weekIds = weeks.map((w) => w.id);
  const weekMap = new Map(
    weeks.map((w) => [w.id, w]),
  );

  // Get assignments from unlocked weeks
  const { data: assignments } = await supabase
    .from('course_assignments')
    .select('*')
    .in('week_id', weekIds)
    .order('sort_order', { ascending: true });

  return (assignments ?? []).map((a) => {
    const week = weekMap.get(a.week_id);
    const course = week ? courseMap.get(week.course_id) : null;
    return {
      id: a.id,
      title_en: a.title_en,
      title_jp: a.title_jp,
      description_en: a.description_en,
      description_jp: a.description_jp,
      assignment_type: a.assignment_type,
      due_date: a.due_date,
      week_number: week?.week_number ?? 0,
      course_title_en: course?.title_en ?? '',
      course_title_jp: course?.title_jp ?? null,
      course_slug: course?.slug ?? '',
    };
  });
}

export async function getCommunityLinksForStudent(
  userId: string,
): Promise<CommunityLink[]> {
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course:courses(id, slug, title_en, title_jp, community_platform, community_link, community_duration_months, zoom_link, thumbnail_url)')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!enrollments) return [];

  return enrollments
    .map((e) => {
      const course = e.course as unknown as {
        id: string;
        slug: string;
        title_en: string;
        title_jp: string | null;
        community_platform: string | null;
        community_link: string | null;
        community_duration_months: number | null;
        zoom_link: string | null;
        thumbnail_url: string | null;
      } | null;
      if (!course) return null;
      return {
        course_id: course.id,
        course_title_en: course.title_en,
        course_title_jp: course.title_jp,
        course_slug: course.slug,
        community_platform: course.community_platform,
        community_link: course.community_link,
        community_duration_months: course.community_duration_months,
        zoom_link: course.zoom_link,
        thumbnail_url: course.thumbnail_url,
      };
    })
    .filter((item): item is CommunityLink => item !== null);
}

export async function getContentLibrary(): Promise<{
  items: ContentItemForStudent[];
  collections: ContentCollectionForStudent[];
}> {
  const supabase = await createClient();

  const [itemsRes, collectionsRes] = await Promise.all([
    supabase
      .from('content_items')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('content_collections')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
  ]);

  const items: ContentItemForStudent[] = (itemsRes.data ?? []).map((item) => ({
    id: item.id,
    title_en: item.title_en,
    title_jp: item.title_jp,
    description_en: item.description_en,
    description_jp: item.description_jp,
    content_type: item.content_type,
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    duration_minutes: item.duration_minutes,
    difficulty_level: item.difficulty_level,
    language: item.language,
    tags: item.tags ?? [],
    access_tier: item.access_tier,
    source: item.source,
  }));

  // Fetch collection items for each collection
  const collections: ContentCollectionForStudent[] = [];
  for (const col of collectionsRes.data ?? []) {
    const { data: colItems } = await supabase
      .from('content_collection_items')
      .select('content_item:content_items(*)')
      .eq('collection_id', col.id)
      .order('sort_order', { ascending: true });

    const collectionItems: ContentItemForStudent[] = (colItems ?? [])
      .map((ci) => {
        const item = ci.content_item as unknown as Record<string, unknown> | null;
        if (!item || !item.is_published) return null;
        return {
          id: item.id as string,
          title_en: item.title_en as string,
          title_jp: (item.title_jp as string | null),
          description_en: (item.description_en as string | null),
          description_jp: (item.description_jp as string | null),
          content_type: item.content_type as string,
          url: item.url as string,
          thumbnail_url: (item.thumbnail_url as string | null),
          duration_minutes: (item.duration_minutes as number | null),
          difficulty_level: item.difficulty_level as string,
          language: item.language as string,
          tags: (item.tags as string[]) ?? [],
          access_tier: item.access_tier as 'free' | 'premium',
          source: (item.source as string | null),
        };
      })
      .filter((item): item is ContentItemForStudent => item !== null);

    collections.push({
      id: col.id,
      slug: col.slug,
      title_en: col.title_en,
      title_jp: col.title_jp,
      description_en: col.description_en,
      description_jp: col.description_jp,
      items: collectionItems,
    });
  }

  return { items, collections };
}

export async function getStudentProfile(
  userId: string,
): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as UserProfile;
}
