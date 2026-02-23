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
