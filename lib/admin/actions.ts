'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ApplicationStatus } from './types';

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

  return { supabase, adminId: user.id };
}

export async function deleteStudent(studentId: string) {
  const { adminId } = await requireAdmin();

  if (studentId === adminId) {
    throw new Error('Cannot delete your own account');
  }

  const supabase = await createClient();

  // Verify the user exists and is a student
  const { data: student, error: fetchError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', studentId)
    .single();

  if (fetchError || !student) throw new Error('Student not found');
  if (student.role === 'admin') throw new Error('Cannot delete an admin account');
  if (student.role === 'instructor') {
    throw new Error('Cannot delete an instructor. Demote to student first.');
  }

  // Delete enrollments
  await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', studentId);

  // Delete from public.users (cascades handled by DB)
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', studentId);

  if (deleteError) throw new Error(`Failed to delete student: ${deleteError.message}`);

  // Delete from auth system
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.deleteUser(studentId);

  if (authError) {
    console.error('[DeleteStudent] Auth deletion failed (public.users already removed):', authError.message);
  }

  revalidatePath('/admin/students');
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  notes?: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updates: Record<string, unknown> = { status };
  if (notes !== undefined) updates.notes = notes;

  const { error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', applicationId);

  if (error) throw error;

  // Notify applicant of status change (fire-and-forget)
  const { data: application } = await supabase
    .from('applications')
    .select('name, email, locale')
    .eq('id', applicationId)
    .single();

  if (application?.email) {
    const { sendApplicationStatusUpdate } = await import('@/lib/email/send');
    void sendApplicationStatusUpdate({
      locale: (application.locale === 'ja' ? 'ja' : 'en') as 'en' | 'ja',
      applicantName: application.name,
      applicantEmail: application.email,
      newStatus: status,
      notes,
    });
  }

  revalidatePath('/admin/applications');
}

export async function manualEnroll(
  userId: string,
  courseId: string,
  notes?: string,
  skipEnrollmentEmail?: boolean,
) {
  const { supabase } = await requireAdmin();

  // Check for existing enrollment
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existing) throw new Error('Student is already enrolled');

  // Create enrollment (comp/scholarship — no payment)
  const { error: enrollError } = await supabase.from('enrollments').insert({
    user_id: userId,
    course_id: courseId,
    amount_paid: 0,
    currency: 'usd',
    status: 'active',
    notes: notes ?? null,
  });

  if (enrollError) throw enrollError;

  // Increment enrollment count
  const { data: course } = await supabase
    .from('courses')
    .select('current_enrollment')
    .eq('id', courseId)
    .single();

  if (course) {
    await supabase
      .from('courses')
      .update({ current_enrollment: (course.current_enrollment ?? 0) + 1 })
      .eq('id', courseId);
  }

  // Send enrollment welcome email to student (fire-and-forget)
  const { data: student } = await supabase
    .from('users')
    .select('full_name, email, locale_preference')
    .eq('id', userId)
    .single();

  const { data: courseForEmail } = await supabase
    .from('courses')
    .select('title_en, title_jp, slug, course_type, start_date')
    .eq('id', courseId)
    .single();

  if (!skipEnrollmentEmail && student?.email && courseForEmail) {
    const emailLocale = (student.locale_preference === 'ja' ? 'ja' : 'en') as 'en' | 'ja';
    const courseTitle =
      emailLocale === 'ja'
        ? (courseForEmail.title_jp ?? courseForEmail.title_en)
        : courseForEmail.title_en;

    const { sendEnrollmentConfirmation, sendEnrollmentAdminNotification } =
      await import('@/lib/email/send');

    const enrollmentData = {
      locale: emailLocale,
      studentName: student.full_name ?? 'Student',
      studentEmail: student.email,
      courseTitle,
      courseSlug: courseForEmail.slug,
      courseType: (courseForEmail.course_type ?? 'self-study') as 'cohort' | 'self-study',
      startDate: courseForEmail.start_date,
      amountPaid: 0,
      currency: 'usd' as const,
      isManualEnroll: true,
    };

    void Promise.all([
      sendEnrollmentConfirmation(enrollmentData),
      sendEnrollmentAdminNotification(enrollmentData),
    ]);
  }

  revalidatePath('/admin/courses');
  revalidatePath('/admin/students');
}

export async function assignSurvey(
  userId: string,
  surveyId: string,
): Promise<{ token: string; slug: string }> {
  await requireAdmin();

  // Use service role to bypass RLS on survey_assignments table
  const adminClient = createAdminClient();

  const { data: survey, error: surveyError } = await adminClient
    .from('surveys')
    .select('slug')
    .eq('id', surveyId)
    .single();

  if (surveyError || !survey) throw new Error('Survey not found');

  const { data: assignment, error } = await adminClient
    .from('survey_assignments')
    .insert({ user_id: userId, survey_id: surveyId })
    .select('token')
    .single();

  if (error) throw new Error(`Failed to create survey assignment: ${error.message}`);

  return { token: assignment.token as string, slug: survey.slug };
}

export async function searchUsers(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (query.trim().length < 2) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('full_name')
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function updateSessionContent(
  sessionId: string,
  updates: {
    replay_url?: string;
    transcript_url?: string;
    slide_deck_url?: string;
    status?: 'upcoming' | 'live' | 'completed';
  },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('course_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) throw error;

  revalidatePath('/learn');
  revalidatePath('/admin/courses');
}
