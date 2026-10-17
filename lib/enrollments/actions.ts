'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function simulatedEnroll(courseId: string, locale: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // The database validates pricing and publication and reserves capacity in
  // one transaction. A client-supplied course id never bypasses checkout.
  const { data: result, error: enrollError } = await supabase.rpc('enroll_in_free_course', {
    p_course_id: courseId,
    p_locale: locale === 'ja' ? 'ja' : 'en',
  });
  if (enrollError) throw enrollError;
  if (!result?.success) throw new Error('Enrollment failed');
  if (result.alreadyEnrolled) return result;
  const course = { slug: result.courseSlug as string };

  // Complete best-effort email work before the server action ends.
  const { data: userProfile } = await supabase
    .from('users')
    .select('full_name, email, locale_preference')
    .eq('id', user.id)
    .single();

  if (userProfile?.email) {
    const { data: courseForEmail } = await supabase
      .from('courses')
      .select('title_en, title_jp, course_type, start_date, price_usd, price_jpy')
      .eq('id', courseId)
      .single();

    if (courseForEmail) {
      const emailLocale = (locale === 'ja' ? 'ja' : 'en') as 'en' | 'ja';
      const courseTitle =
        emailLocale === 'ja'
          ? (courseForEmail.title_jp ?? courseForEmail.title_en)
          : courseForEmail.title_en;

      const { sendEnrollmentConfirmation, sendEnrollmentAdminNotification } =
        await import('@/lib/email/send');

      await Promise.all([
        sendEnrollmentConfirmation({
          locale: emailLocale,
          studentName: userProfile.full_name ?? 'Student',
          studentEmail: userProfile.email,
          courseTitle,
          courseSlug: course.slug,
          courseType: (courseForEmail.course_type ?? 'self-study') as 'cohort' | 'self-study',
          startDate: courseForEmail.start_date,
          amountPaid: 0,
          currency: (locale === 'ja' ? 'jpy' : 'usd') as 'usd' | 'jpy',
          isManualEnroll: false,
        }),
        sendEnrollmentAdminNotification({
          locale: emailLocale,
          studentName: userProfile.full_name ?? 'Student',
          studentEmail: userProfile.email,
          courseTitle,
          courseSlug: course.slug,
          courseType: (courseForEmail.course_type ?? 'self-study') as 'cohort' | 'self-study',
          startDate: courseForEmail.start_date,
          amountPaid: 0,
          currency: (locale === 'ja' ? 'jpy' : 'usd') as 'usd' | 'jpy',
          isManualEnroll: false,
        }),
      ]);
    }
  }

  revalidatePath('/learn');
  revalidatePath('/learn/dashboard');

  return { success: true, alreadyEnrolled: false, courseSlug: course.slug };
}

export async function cancelEnrollment(enrollmentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get enrollment to decrement count
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('id', enrollmentId)
    .eq('user_id', user.id)
    .single();

  if (!enrollment) throw new Error('Enrollment not found');

  await supabase
    .from('enrollments')
    .update({ status: 'cancelled' })
    .eq('id', enrollmentId);

  // Decrement enrollment count
  const { data: course } = await supabase
    .from('courses')
    .select('current_enrollment')
    .eq('id', enrollment.course_id)
    .single();

  if (course && course.current_enrollment > 0) {
    await supabase
      .from('courses')
      .update({ current_enrollment: course.current_enrollment - 1 })
      .eq('id', enrollment.course_id);
  }

  revalidatePath('/learn');
  revalidatePath('/learn/dashboard');
}
