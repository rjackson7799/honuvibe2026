'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  InstructorProfileCreateInput,
  InstructorProfileUpdateInput,
} from './types';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Not authorized');

  return supabase;
}

export async function searchUserByEmail(email: string): Promise<{
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
} | null> {
  const supabase = await requireAdmin();

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('email', email)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function createInstructorProfile(
  userId: string,
  data: InstructorProfileCreateInput,
): Promise<{ id: string }> {
  const supabase = await requireAdmin();

  // Verify target user exists
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (userError || !targetUser) throw new Error('User not found');
  if (targetUser.role === 'instructor') throw new Error('User is already an instructor');
  if (targetUser.role === 'admin') throw new Error('Cannot promote admin to instructor');

  // Create instructor profile
  const { data: profile, error: profileError } = await supabase
    .from('instructor_profiles')
    .insert({
      user_id: userId,
      display_name: data.display_name,
      title_en: data.title_en ?? null,
      title_jp: data.title_jp ?? null,
      bio_short_en: data.bio_short_en ?? null,
      bio_short_jp: data.bio_short_jp ?? null,
      bio_long_en: data.bio_long_en ?? null,
      bio_long_jp: data.bio_long_jp ?? null,
      website_url: data.website_url ?? null,
      linkedin_url: data.linkedin_url ?? null,
      twitter_url: data.twitter_url ?? null,
    })
    .select('id')
    .single();

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  // Update user role to instructor
  const { error: roleError } = await supabase
    .from('users')
    .update({ role: 'instructor', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (roleError) {
    // Rollback: delete the profile we just created
    await supabase.from('instructor_profiles').delete().eq('id', profile.id);
    throw new Error(`Failed to update role: ${roleError.message}`);
  }

  revalidatePath('/admin/instructors');
  return { id: profile.id };
}

export async function updateInstructorProfile(
  profileId: string,
  data: InstructorProfileUpdateInput,
) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('instructor_profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', profileId);

  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  revalidatePath('/admin/instructors');
  revalidatePath(`/admin/instructors/${profileId}`);
  revalidatePath('/learn');
}

export async function demoteToStudent(profileId: string) {
  const supabase = await requireAdmin();

  // Get user_id from profile
  const { data: profile, error: profileError } = await supabase
    .from('instructor_profiles')
    .select('user_id')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) throw new Error('Instructor profile not found');

  // Check for active course assignments
  const { data: assignedCourses } = await supabase
    .from('courses')
    .select('id')
    .eq('instructor_id', profileId)
    .in('status', ['published', 'in-progress']);

  if (assignedCourses && assignedCourses.length > 0) {
    throw new Error(
      `Cannot demote: instructor is assigned to ${assignedCourses.length} active course(s). Remove assignments first.`,
    );
  }

  // Update user role back to student
  const { error: roleError } = await supabase
    .from('users')
    .update({ role: 'student', updated_at: new Date().toISOString() })
    .eq('id', profile.user_id);

  if (roleError) throw new Error(`Failed to update role: ${roleError.message}`);

  // Delete instructor profile
  const { error: deleteError } = await supabase
    .from('instructor_profiles')
    .delete()
    .eq('id', profileId);

  if (deleteError) throw new Error(`Failed to delete profile: ${deleteError.message}`);

  revalidatePath('/admin/instructors');
  revalidatePath('/admin/courses');
}

export async function assignInstructorToCourse(
  courseId: string,
  instructorId: string | null,
) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('courses')
    .update({
      instructor_id: instructorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId);

  if (error) throw new Error(`Failed to assign instructor: ${error.message}`);

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/learn');
}
