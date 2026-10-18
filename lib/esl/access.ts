import { createClient } from '@/lib/supabase/server';
import type { ESLAccessResult } from './types';

export async function checkESLAccess(
  userId: string,
  courseId: string,
): Promise<ESLAccessResult> {
  const supabase = await createClient();

  // A global instructor role is not access to another teacher's materials.
  const { data: canManage } = await supabase.rpc('can_manage_course', { p_course: courseId });
  if (canManage === true) return { hasAccess: true, source: 'admin' };

  // Check if course has ESL included with enrollment
  const { data: course } = await supabase
    .from('course_catalog')
    .select('esl_enabled, esl_included')
    .eq('id', courseId)
    .single();

  if (!course?.esl_enabled) {
    return { hasAccess: false, source: null };
  }

  // If ESL is included, check for a live enrollment ('completed' still counts —
  // finishing the course must not revoke ESL access the purchase granted).
  if (course.esl_included) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
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
