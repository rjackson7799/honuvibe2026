import { createClient } from '@/lib/supabase/server';
import type { ESLAccessResult } from './types';

export async function checkESLAccess(
  userId: string,
  courseId: string,
): Promise<ESLAccessResult> {
  const supabase = await createClient();

  // Admin / instructor bypass
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (user?.role === 'admin' || user?.role === 'instructor') {
    return { hasAccess: true, source: 'admin' };
  }

  // Check if course has ESL included with enrollment
  const { data: course } = await supabase
    .from('courses')
    .select('esl_enabled, esl_included')
    .eq('id', courseId)
    .single();

  if (!course?.esl_enabled) {
    return { hasAccess: false, source: null };
  }

  // If ESL is included, check for active enrollment
  if (course.esl_included) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle();

    if (enrollment) {
      return { hasAccess: true, source: 'included' };
    }
  }

  // Check for ESL add-on purchase
  const { data: purchase } = await supabase
    .from('esl_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (purchase) {
    return { hasAccess: true, source: 'purchased' };
  }

  return { hasAccess: false, source: null };
}
