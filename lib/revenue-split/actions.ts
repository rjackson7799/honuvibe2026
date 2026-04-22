'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

type RevenueSplitWeightInput = {
  courseInstructorId: string;
  revenueSharePct: number;
};

export async function updateCourseRevenueSplit(
  courseId: string,
  input: {
    instructorSharePct: number;
    weights: RevenueSplitWeightInput[];
  },
) {
  const supabase = await requireAdmin();

  const instructorSharePct = Number(input.instructorSharePct ?? 0);
  if (!Number.isFinite(instructorSharePct) || instructorSharePct < 0 || instructorSharePct > 100) {
    throw new Error('Instructor revenue share must be between 0 and 100.');
  }

  const normalizedWeights = input.weights.map((weight) => ({
    courseInstructorId: weight.courseInstructorId,
    revenueSharePct: Number(weight.revenueSharePct ?? 0),
  }));

  if (
    normalizedWeights.some(
      (weight) =>
        !Number.isFinite(weight.revenueSharePct) ||
        weight.revenueSharePct < 0 ||
        weight.revenueSharePct > 100,
    )
  ) {
    throw new Error('Instructor weights must be between 0 and 100.');
  }

  const totalWeight = normalizedWeights.reduce(
    (sum, weight) => sum + weight.revenueSharePct,
    0,
  );

  if (instructorSharePct > 0 && Math.abs(totalWeight - 100) > 0.001) {
    throw new Error('Instructor weights must sum to 100 when the pool is non-zero.');
  }

  const { error: courseError } = await supabase
    .from('courses')
    .update({
      instructor_revenue_share_pct: instructorSharePct,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId);

  if (courseError) {
    throw new Error(`Failed to update course revenue split: ${courseError.message}`);
  }

  for (const weight of normalizedWeights) {
    const { error } = await supabase
      .from('course_instructors')
      .update({ revenue_share_pct: weight.revenueSharePct })
      .eq('id', weight.courseInstructorId)
      .eq('course_id', courseId);

    if (error) {
      throw new Error(`Failed to update instructor weight: ${error.message}`);
    }
  }

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${courseId}`);

  return { success: true };
}
