'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ApplicationStatus } from './types';

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
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

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

  if (student?.email && courseForEmail) {
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
