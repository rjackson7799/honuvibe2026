'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { CourseProposalInput } from './types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function uniqueProposalSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  const root = `proposal-${base || 'untitled'}`.slice(0, 80);

  let candidate = root;
  let suffix = 1;
  while (true) {
    const { data, error } = await admin
      .from('courses')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

async function requireInstructor() {
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
  if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
    throw new Error('Not authorized');
  }

  const { data: instructorProfile } = await supabase
    .from('instructor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!instructorProfile) throw new Error('No instructor profile');

  return { userId: user.id, instructorProfileId: instructorProfile.id };
}

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

  return { supabase, userId: user.id };
}

function validateProposal(input: CourseProposalInput): void {
  if (!input.title_en?.trim()) throw new Error('Title is required');
  if (!input.description_en?.trim()) throw new Error('Description is required');
  if (!['beginner', 'intermediate', 'advanced'].includes(input.level)) {
    throw new Error('Level is required');
  }
  if (!Array.isArray(input.learning_outcomes_en) || input.learning_outcomes_en.filter(Boolean).length < 3) {
    throw new Error('At least 3 learning outcomes are required');
  }
  if (!Array.isArray(input.who_is_for_en) || input.who_is_for_en.filter(Boolean).length < 1) {
    throw new Error('Add at least one "Who is it for" entry');
  }
  if (!Number.isFinite(input.price_usd) || input.price_usd < 0) {
    throw new Error('USD price must be a non-negative number');
  }
  if (!Number.isFinite(input.price_jpy) || input.price_jpy < 0) {
    throw new Error('JPY price must be a non-negative number');
  }
}

function normalizeProposal(input: CourseProposalInput) {
  return {
    title_en: input.title_en.trim(),
    description_en: input.description_en.trim(),
    level: input.level,
    learning_outcomes_en: input.learning_outcomes_en.map((s) => s.trim()).filter(Boolean),
    who_is_for_en: input.who_is_for_en.map((s) => s.trim()).filter(Boolean),
    tools_covered: (input.tools_covered ?? []).map((s) => s.trim()).filter(Boolean),
    price_usd: Math.round(input.price_usd * 100), // dollars → cents
    price_jpy: Math.round(input.price_jpy), // yen as-is
  };
}

export async function createInstructorProposal(
  input: CourseProposalInput,
): Promise<{ id: string }> {
  const { instructorProfileId } = await requireInstructor();
  validateProposal(input);
  const fields = normalizeProposal(input);

  const slug = await uniqueProposalSlug(slugify(fields.title_en));
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('courses')
    .insert({
      ...fields,
      slug,
      status: 'proposal',
      proposed_by_instructor_id: instructorProfileId,
      proposal_submitted_at: new Date().toISOString(),
      is_published: false,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Failed to create proposal: ${error?.message ?? 'unknown'}`);

  revalidatePath('/instructor/courses');
  revalidatePath('/admin/courses/proposals');
  return { id: data.id };
}

export async function updateInstructorProposal(
  courseId: string,
  input: CourseProposalInput,
): Promise<void> {
  const { instructorProfileId } = await requireInstructor();
  validateProposal(input);
  const fields = normalizeProposal(input);

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('courses')
    .select('id, status, proposed_by_instructor_id')
    .eq('id', courseId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Proposal not found');
  if (existing.proposed_by_instructor_id !== instructorProfileId) {
    throw new Error('Not authorized to edit this proposal');
  }
  if (existing.status !== 'proposal') {
    throw new Error('Proposal can only be edited while in "proposal" status');
  }

  const { error } = await admin.from('courses').update(fields).eq('id', courseId);
  if (error) throw new Error(`Failed to update proposal: ${error.message}`);

  revalidatePath('/instructor/courses');
  revalidatePath(`/instructor/courses/${courseId}/edit`);
  revalidatePath('/admin/courses/proposals');
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function approveProposal(courseId: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('courses')
    .select('id, status')
    .eq('id', courseId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Course not found');
  if (existing.status !== 'proposal') {
    throw new Error(`Cannot approve a course with status "${existing.status}"`);
  }

  const { error } = await admin
    .from('courses')
    .update({ status: 'draft', proposal_review_notes: null })
    .eq('id', courseId);

  if (error) throw new Error(`Failed to approve: ${error.message}`);

  revalidatePath('/admin/courses/proposals');
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
}

export async function rejectProposal(
  courseId: string,
  reviewNotes: string,
): Promise<void> {
  await requireAdmin();
  if (!reviewNotes?.trim()) throw new Error('Reason is required');
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('courses')
    .select('id, status')
    .eq('id', courseId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Course not found');
  if (existing.status !== 'proposal') {
    throw new Error(`Cannot reject a course with status "${existing.status}"`);
  }

  const { error } = await admin
    .from('courses')
    .update({ status: 'rejected', proposal_review_notes: reviewNotes.trim() })
    .eq('id', courseId);

  if (error) throw new Error(`Failed to reject: ${error.message}`);

  revalidatePath('/admin/courses/proposals');
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/instructor/courses');
}
