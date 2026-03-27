import { createClient } from '@/lib/supabase/server';
import type {
  InstructorProfile,
  InstructorWithUser,
  InstructorCardData,
  InstructorListItem,
  CourseInstructorWithProfile,
  CourseInstructorRole,
} from './types';

export async function getAdminInstructors(): Promise<InstructorListItem[]> {
  const supabase = await createClient();

  // Fetch all instructor profiles with user info
  const { data: profiles, error } = await supabase
    .from('instructor_profiles')
    .select('id, user_id, display_name, title_en, photo_url, is_active')
    .order('display_name', { ascending: true });

  if (error) throw error;
  if (!profiles || profiles.length === 0) return [];

  // Fetch user emails for each profile
  const userIds = profiles.map((p) => p.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('id', userIds);

  // Count courses per instructor (via join table)
  const { data: courses } = await supabase
    .from('course_instructors')
    .select('instructor_id')
    .in('instructor_id', profiles.map((p) => p.id));

  const courseCounts = new Map<string, number>();
  if (courses) {
    for (const c of courses) {
      courseCounts.set(c.instructor_id, (courseCounts.get(c.instructor_id) ?? 0) + 1);
    }
  }

  const userMap = new Map(users?.map((u) => [u.id, u.email]) ?? []);

  return profiles.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    display_name: p.display_name,
    title_en: p.title_en,
    photo_url: p.photo_url,
    is_active: p.is_active,
    email: userMap.get(p.user_id) ?? null,
    course_count: courseCounts.get(p.id) ?? 0,
  }));
}

export async function getAdminInstructorById(
  id: string,
): Promise<(InstructorWithUser & { courses: { id: string; title_en: string; status: string; start_date: string | null }[] }) | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('instructor_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !profile) return null;

  // Fetch linked user info
  const { data: user } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', profile.user_id)
    .single();

  // Fetch assigned courses via join table
  const { data: courseLinks } = await supabase
    .from('course_instructors')
    .select('course_id')
    .eq('instructor_id', id);

  const courseIds = courseLinks?.map((cl) => cl.course_id) ?? [];
  const { data: courses } = courseIds.length > 0
    ? await supabase
        .from('courses')
        .select('id, title_en, status, start_date')
        .in('id', courseIds)
        .order('created_at', { ascending: false })
    : { data: [] as { id: string; title_en: string; status: string; start_date: string | null }[] };

  return {
    ...profile,
    user: {
      email: user?.email ?? null,
      full_name: user?.full_name ?? null,
    },
    courses: courses ?? [],
  };
}

export async function getInstructorByUserId(
  userId: string,
): Promise<InstructorProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('instructor_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getInstructorForCourse(
  instructorId: string,
): Promise<InstructorCardData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('instructor_profiles')
    .select('display_name, title_en, title_jp, bio_short_en, bio_short_jp, bio_long_en, bio_long_jp, photo_url, website_url')
    .eq('id', instructorId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

// Lightweight list for dropdowns (e.g., course assignment)
export async function getActiveInstructorOptions(): Promise<
  { id: string; display_name: string; photo_url: string | null }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('instructor_profiles')
    .select('id, display_name, photo_url')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ── Instructor-facing: classes assigned to this user ──

export interface InstructorClassItem {
  course_id: string;
  title_en: string;
  title_jp: string | null;
  slug: string;
  status: string;
  territory: string | null;
  thumbnail_url: string | null;
  start_date: string | null;
  role: CourseInstructorRole;
  enrolled_count: number;
  next_session: {
    id: string;
    title_en: string;
    title_jp: string | null;
    scheduled_at: string;
    format: string;
  } | null;
}

export interface InstructorUpcomingSession {
  id: string;
  title_en: string;
  title_jp: string | null;
  scheduled_at: string;
  format: string;
  course_title_en: string;
  course_title_jp: string | null;
  course_slug: string;
}

export async function getInstructorClassesByUserId(
  userId: string,
): Promise<{ profile: InstructorProfile | null; classes: InstructorClassItem[]; upcomingSessions: InstructorUpcomingSession[] }> {
  const supabase = await createClient();

  // 1. Get instructor profile
  const { data: profile } = await supabase
    .from('instructor_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!profile) return { profile: null, classes: [], upcomingSessions: [] };

  // 2. Get course assignments via join table
  const { data: assignments } = await supabase
    .from('course_instructors')
    .select('course_id, role')
    .eq('instructor_id', profile.id);

  if (!assignments || assignments.length === 0) return { profile, classes: [], upcomingSessions: [] };

  const courseIds = assignments.map((a) => a.course_id);
  const roleMap = new Map(assignments.map((a) => [a.course_id, a.role as CourseInstructorRole]));

  // 3. Get course details
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title_en, title_jp, slug, status, territory, thumbnail_url, start_date')
    .in('id', courseIds)
    .order('start_date', { ascending: false });

  // 4. Count enrolled students per course
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('course_id', courseIds);

  const enrollCounts = new Map<string, number>();
  if (enrollments) {
    for (const e of enrollments) {
      enrollCounts.set(e.course_id, (enrollCounts.get(e.course_id) ?? 0) + 1);
    }
  }

  // 5. Get upcoming sessions for this instructor
  const now = new Date().toISOString();
  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, title_en, title_jp, scheduled_at, format, course_id')
    .in('course_id', courseIds)
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(20);

  // Build next-session map (first upcoming session per course)
  const nextSessionMap = new Map<string, InstructorUpcomingSession & { id: string }>();
  const upcomingSessions: InstructorUpcomingSession[] = [];

  if (sessions) {
    for (const s of sessions) {
      const course = courses?.find((c) => c.id === s.course_id);
      const sessionItem: InstructorUpcomingSession = {
        id: s.id,
        title_en: s.title_en,
        title_jp: s.title_jp,
        scheduled_at: s.scheduled_at,
        format: s.format,
        course_title_en: course?.title_en ?? '',
        course_title_jp: course?.title_jp ?? null,
        course_slug: course?.slug ?? '',
      };
      upcomingSessions.push(sessionItem);
      if (!nextSessionMap.has(s.course_id)) {
        nextSessionMap.set(s.course_id, { ...sessionItem, id: s.id });
      }
    }
  }

  // 6. Build class items
  const classes: InstructorClassItem[] = (courses ?? []).map((c) => {
    const next = nextSessionMap.get(c.id);
    return {
      course_id: c.id,
      title_en: c.title_en,
      title_jp: c.title_jp,
      slug: c.slug,
      status: c.status,
      territory: c.territory,
      thumbnail_url: c.thumbnail_url,
      start_date: c.start_date,
      role: roleMap.get(c.id) ?? 'instructor',
      enrolled_count: enrollCounts.get(c.id) ?? 0,
      next_session: next ? {
        id: next.id,
        title_en: next.title_en,
        title_jp: next.title_jp,
        scheduled_at: next.scheduled_at,
        format: next.format,
      } : null,
    };
  });

  return { profile, classes, upcomingSessions: upcomingSessions.slice(0, 5) };
}

// Fetch all instructors for a course (many-to-many via join table)
export async function getInstructorsForCourse(
  courseId: string,
): Promise<CourseInstructorWithProfile[]> {
  const supabase = await createClient();

  const { data: links, error } = await supabase
    .from('course_instructors')
    .select('id, course_id, instructor_id, role, sort_order, created_at')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  if (error || !links || links.length === 0) return [];

  // Fetch instructor profiles
  const instructorIds = links.map((l) => l.instructor_id);
  const { data: profiles } = await supabase
    .from('instructor_profiles')
    .select('id, display_name, title_en, title_jp, bio_short_en, bio_short_jp, bio_long_en, bio_long_jp, photo_url, website_url')
    .in('id', instructorIds)
    .eq('is_active', true);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return links
    .filter((l) => profileMap.has(l.instructor_id))
    .map((l) => ({
      ...l,
      instructor: profileMap.get(l.instructor_id)!,
    }));
}
