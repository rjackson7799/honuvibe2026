'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function simulatedEnroll(courseId: string, locale: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existing) {
    return { success: true, alreadyEnrolled: true };
  }

  // Check course capacity
  const { data: course } = await supabase
    .from('courses')
    .select('max_enrollment, current_enrollment, slug')
    .eq('id', courseId)
    .single();

  if (!course) throw new Error('Course not found');

  if (
    course.max_enrollment &&
    course.current_enrollment >= course.max_enrollment
  ) {
    throw new Error('Course is full');
  }

  // Create enrollment (simulated — no real payment)
  const { error: enrollError } = await supabase.from('enrollments').insert({
    user_id: user.id,
    course_id: courseId,
    amount_paid: 0,
    currency: locale === 'ja' ? 'jpy' : 'usd',
    status: 'active',
  });

  if (enrollError) throw enrollError;

  // Increment enrollment count
  await supabase
    .from('courses')
    .update({ current_enrollment: course.current_enrollment + 1 })
    .eq('id', courseId);

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
