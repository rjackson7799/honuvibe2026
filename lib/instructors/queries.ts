import { createClient } from '@/lib/supabase/server';
import type {
  InstructorProfile,
  InstructorWithUser,
  InstructorCardData,
  InstructorListItem,
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

  // Count courses per instructor
  const { data: courses } = await supabase
    .from('courses')
    .select('instructor_id')
    .in('instructor_id', profiles.map((p) => p.id));

  const courseCounts = new Map<string, number>();
  if (courses) {
    for (const c of courses) {
      if (c.instructor_id) {
        courseCounts.set(c.instructor_id, (courseCounts.get(c.instructor_id) ?? 0) + 1);
      }
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

  // Fetch assigned courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title_en, status, start_date')
    .eq('instructor_id', id)
    .order('created_at', { ascending: false });

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
