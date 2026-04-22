import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Course } from '@/lib/courses/types';
import type { InstructorCourseRow, InstructorScope } from './types';

export async function resolveInstructorScope(
  locale: string,
): Promise<InstructorScope> {
  const supabase = await createClient();
  const prefix = locale === 'ja' ? '/ja' : '';

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${prefix}/learn/auth?redirect=${prefix}/instructor/courses`);
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
    redirect(`${prefix}/learn/dashboard`);
  }

  const { data: instructorProfile } = await supabase
    .from('instructor_profiles')
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!instructorProfile) {
    redirect(`${prefix}/learn/dashboard`);
  }

  return {
    userId: user.id,
    instructorProfileId: instructorProfile.id,
    displayName: instructorProfile.display_name,
  };
}

export async function getMyInstructorCourses(
  instructorProfileId: string,
): Promise<InstructorCourseRow[]> {
  const supabase = await createClient();

  const { data: proposed, error: proposedError } = await supabase
    .from('courses')
    .select(
      'id, slug, title_en, description_en, level, status, is_published, price_usd, price_jpy, proposal_submitted_at, proposal_review_notes, created_at, updated_at',
    )
    .eq('proposed_by_instructor_id', instructorProfileId)
    .order('updated_at', { ascending: false });

  if (proposedError) throw new Error(proposedError.message);

  const { data: taught, error: taughtError } = await supabase
    .from('course_instructors')
    .select(
      'course:courses(id, slug, title_en, description_en, level, status, is_published, price_usd, price_jpy, proposal_submitted_at, proposal_review_notes, created_at, updated_at)',
    )
    .eq('instructor_profile_id', instructorProfileId);

  if (taughtError) throw new Error(taughtError.message);

  const byId = new Map<string, InstructorCourseRow>();
  for (const row of proposed ?? []) byId.set(row.id, row as InstructorCourseRow);
  for (const row of taught ?? []) {
    const raw = (row as unknown as { course: InstructorCourseRow | InstructorCourseRow[] | null })
      .course;
    const c = Array.isArray(raw) ? raw[0] : raw;
    if (c && !byId.has(c.id)) byId.set(c.id, c);
  }

  return Array.from(byId.values()).sort((a, b) =>
    (b.updated_at ?? '').localeCompare(a.updated_at ?? ''),
  );
}

export async function getMyProposalById(
  courseId: string,
  instructorProfileId: string,
): Promise<Course | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('proposed_by_instructor_id', instructorProfileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Course | null) ?? null;
}

export async function getProposalsForAdmin(): Promise<InstructorCourseRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, slug, title_en, description_en, level, status, is_published, price_usd, price_jpy, proposal_submitted_at, proposal_review_notes, created_at, updated_at, proposed_by_instructor_id',
    )
    .in('status', ['proposal', 'rejected'])
    .order('proposal_submitted_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as InstructorCourseRow[];
}
