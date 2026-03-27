'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  InstructorProfileCreateInput,
  InstructorProfileUpdateInput,
  CourseInstructorRole,
} from './types';
import {
  sendInstructorWelcomeEmail,
  sendInstructorWelcomeAdminNotification,
} from '@/lib/email/send';
import type { Locale } from '@/lib/email/types';

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

export async function createNewUserAndInstructor(
  email: string,
  fullName: string,
  profileData: InstructorProfileCreateInput,
): Promise<{ id: string }> {
  const supabase = await requireAdmin();

  // Check no existing user with this email
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new Error('A user with this email already exists. Use the promote flow instead.');
  }

  // Create auth user via admin client (no password — instructor uses reset flow)
  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      throw new Error('This email is already registered in the auth system.');
    }
    throw new Error(`Failed to create user account: ${authError.message}`);
  }

  const newUserId = authData.user.id;

  // Wait for handle_new_user() trigger to create public.users row
  let publicUser = null;
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', newUserId)
      .maybeSingle();
    if (data) {
      publicUser = data;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!publicUser) {
    await adminClient.auth.admin.deleteUser(newUserId);
    throw new Error('User profile was not created. Please try again.');
  }

  return createInstructorProfile(newUserId, profileData);
}

export async function sendInstructorWelcomeEmailAction(
  email: string,
  displayName: string,
  titleEn: string | null,
  titleJp: string | null,
  type: 'new' | 'promoted',
  locale: Locale,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const adminClient = createAdminClient();

  try {
    // For new users: invite link → they set a password
    // For promoted users: magic link → they log in directly
    const linkType = type === 'new' ? 'invite' : 'magiclink';
    const redirectTo =
      type === 'new'
        ? `${siteUrl}/api/auth/callback?redirect=/learn/auth/reset`
        : `${siteUrl}/api/auth/callback?redirect=/learn/dashboard`;

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: linkType,
        email,
        options: { redirectTo },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Instructor Email] Failed to generate link:', linkError?.message);
      return { success: false, error: linkError?.message ?? 'Failed to generate login link' };
    }

    await sendInstructorWelcomeEmail({
      locale,
      displayName,
      email,
      titleEn,
      titleJp,
      actionLink: linkData.properties.action_link,
      type,
    });

    await sendInstructorWelcomeAdminNotification({
      displayName,
      email,
      type,
      emailSent: true,
    });

    return { success: true };
  } catch (err) {
    console.error('[Instructor Email] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send welcome email',
    };
  }
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

  // Check for active course assignments via join table
  const { data: courseLinks } = await supabase
    .from('course_instructors')
    .select('course_id')
    .eq('instructor_id', profileId);

  if (courseLinks && courseLinks.length > 0) {
    // Check if any linked courses are active
    const { data: activeCourses } = await supabase
      .from('courses')
      .select('id')
      .in('id', courseLinks.map((cl) => cl.course_id))
      .in('status', ['published', 'in-progress']);

    if (activeCourses && activeCourses.length > 0) {
      throw new Error(
        `Cannot demote: instructor is assigned to ${activeCourses.length} active course(s). Remove assignments first.`,
      );
    }
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

// Legacy: assign single instructor (kept for backward compat, syncs join table)
export async function assignInstructorToCourse(
  courseId: string,
  instructorId: string | null,
) {
  const supabase = await requireAdmin();

  // Update legacy column
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

// --- Multi-instructor actions ---

export async function addInstructorToCourse(
  courseId: string,
  instructorId: string,
  role: CourseInstructorRole = 'instructor',
) {
  const supabase = await requireAdmin();

  // Get current max sort_order for this course
  const { data: existing } = await supabase
    .from('course_instructors')
    .select('sort_order')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  // If this is the first instructor, make them lead
  const effectiveRole = nextOrder === 0 ? 'lead' : role;

  const { error } = await supabase
    .from('course_instructors')
    .insert({
      course_id: courseId,
      instructor_id: instructorId,
      role: effectiveRole,
      sort_order: nextOrder,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This instructor is already assigned to this course.');
    }
    throw new Error(`Failed to add instructor: ${error.message}`);
  }

  // Sync legacy courses.instructor_id (set to lead instructor)
  await syncLegacyInstructorId(supabase, courseId);

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/instructors');
  revalidatePath('/learn');
}

export async function removeInstructorFromCourse(
  courseId: string,
  instructorId: string,
) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('course_instructors')
    .delete()
    .eq('course_id', courseId)
    .eq('instructor_id', instructorId);

  if (error) throw new Error(`Failed to remove instructor: ${error.message}`);

  // Also clear session-level assignments for this instructor
  await supabase
    .from('course_sessions')
    .update({ instructor_id: null })
    .eq('instructor_id', instructorId);

  // Sync legacy courses.instructor_id
  await syncLegacyInstructorId(supabase, courseId);

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/instructors');
  revalidatePath('/learn');
}

export async function updateCourseInstructorRole(
  courseInstructorId: string,
  role: CourseInstructorRole,
) {
  const supabase = await requireAdmin();

  // Get the course_id so we can revalidate and sync
  const { data: link } = await supabase
    .from('course_instructors')
    .select('course_id')
    .eq('id', courseInstructorId)
    .single();

  if (!link) throw new Error('Course instructor assignment not found');

  const { error } = await supabase
    .from('course_instructors')
    .update({ role })
    .eq('id', courseInstructorId);

  if (error) throw new Error(`Failed to update role: ${error.message}`);

  // Sync legacy column
  await syncLegacyInstructorId(supabase, link.course_id);

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${link.course_id}`);
  revalidatePath('/learn');
}

// Helper: sync courses.instructor_id with the lead from the join table
async function syncLegacyInstructorId(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  courseId: string,
) {
  const { data: instructors } = await supabase
    .from('course_instructors')
    .select('instructor_id, role')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  const lead = instructors?.find((i) => i.role === 'lead') ?? instructors?.[0] ?? null;

  await supabase
    .from('courses')
    .update({
      instructor_id: lead?.instructor_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId);
}
