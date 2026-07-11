'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireTutoringAccessForReport } from './auth';
import { generatedSessionReportSchema } from './schemas';
import { splitReport } from './split';
import type { GeneratedSessionReport, SourceImageRef } from './types';

// INVARIANT: every write in this file runs through createAdminClient()
// (service role) after one of the code-level gates below (requireAdmin /
// requireTutoringAccessForReport) — RLS grants instructors READ access only
// (migration 058), not writes. Converting any of these actions to the
// user-scoped client would silently break teacher writes: the code gate
// would still pass for an assigned instructor, but RLS would then reject the
// INSERT/UPDATE/DELETE itself.

async function requireAdmin(): Promise<{ adminId: string }> {
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
  return { adminId: user.id };
}

/** Revalidate every surface a report change can touch (admin + student, both locales). */
async function revalidateForReport(
  admin: SupabaseClient,
  courseId: string,
  reportId: string,
): Promise<void> {
  revalidatePath(`/admin/tutoring/${courseId}`);
  revalidatePath(`/admin/tutoring/${courseId}/reports/${reportId}`);
  revalidatePath(`/instructor/tutoring/${courseId}`);
  revalidatePath(`/instructor/tutoring/${courseId}/reports/${reportId}`);
  revalidatePath(`/ja/instructor/tutoring/${courseId}`);
  revalidatePath(`/ja/instructor/tutoring/${courseId}/reports/${reportId}`);
  const { data: course } = await admin
    .from('courses')
    .select('slug')
    .eq('id', courseId)
    .maybeSingle();
  if (course?.slug) {
    revalidatePath(`/learn/dashboard/${course.slug}`);
    revalidatePath(`/ja/learn/dashboard/${course.slug}`);
  }
}

/**
 * Single-teacher invariant for a 1v1 engagement: replace whatever is in
 * course_instructors for this course with at most one 'lead' row, and sync
 * the legacy courses.instructor_id / instructor_name columns that admin UI
 * (list1v1Courses' teacherName, etc.) still reads. Deliberately NOT
 * addInstructorToCourse (lib/instructors/actions.ts) — that models
 * multi-instructor assignment with roles + revenue-share percentages, which
 * don't apply to a 1-on-1 engagement. Shared by setTutoringTeacher and
 * createTutoringCourse so the sync logic lives in exactly one place.
 */
async function assignTeacher(
  admin: SupabaseClient,
  courseId: string,
  instructorProfileId: string | null,
): Promise<void> {
  let displayName: string | null = null;
  if (instructorProfileId) {
    const { data: profile, error: profileError } = await admin
      .from('instructor_profiles')
      .select('display_name, is_active')
      .eq('id', instructorProfileId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile || !profile.is_active) throw new Error('Instructor not found or inactive.');
    displayName = profile.display_name;
  }

  const { error: delError } = await admin
    .from('course_instructors')
    .delete()
    .eq('course_id', courseId);
  if (delError) throw new Error(delError.message);

  if (instructorProfileId) {
    const { error: insError } = await admin
      .from('course_instructors')
      .insert({ course_id: courseId, instructor_id: instructorProfileId, role: 'lead' });
    if (insError) throw new Error(insError.message);
  }

  const { error: courseError } = await admin
    .from('courses')
    .update({ instructor_id: instructorProfileId, instructor_name: displayName })
    .eq('id', courseId);
  if (courseError) throw new Error(courseError.message);
}

/**
 * Create a bare 1v1 engagement — a private, published `courses` shell with no
 * curriculum (the AI course wizard is wrong for this: it generates weeks/
 * sessions). After this, the engagement dashboard offers an inline enroll
 * control for existing students (/admin/students/new remains the path for a
 * student with no account yet).
 */
export async function createTutoringCourse(input: {
  titleEn: string;
  titleJp?: string | null;
  instructorName?: string | null;
  instructorProfileId?: string | null;
}): Promise<{ courseId: string; slug: string }> {
  await requireAdmin();
  const titleEn = input.titleEn.trim();
  if (!titleEn) throw new Error('A title is required.');

  const admin = createAdminClient();

  // Derive a unique slug from the title.
  const base =
    titleEn
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'engagement';
  let slug = base;
  for (let i = 2; i < 50; i += 1) {
    const { data: taken } = await admin
      .from('courses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${i}`;
  }

  const { data, error } = await admin
    .from('courses')
    .insert({
      slug,
      course_type: '1v1',
      title_en: titleEn,
      title_jp: input.titleJp?.trim() || null,
      // instructor_name is synced by assignTeacher() below when a teacher is
      // chosen up front; otherwise the engagement starts genuinely
      // unassigned (the list page shows "Unassigned") rather than the old
      // hardcoded 'Ryan Jackson' default.
      instructor_name: input.instructorProfileId ? null : input.instructorName?.trim() || null,
      language: 'both',
      is_private: true,
      is_published: true,
      status: 'published',
      max_enrollment: 1,
      current_enrollment: 0,
    })
    .select('id, slug')
    .single();
  if (error) throw new Error(error.message);

  if (input.instructorProfileId) {
    await assignTeacher(admin, data.id, input.instructorProfileId);
  }

  revalidatePath('/admin/tutoring');
  return { courseId: data.id, slug: data.slug };
}

/**
 * Admin-only: assign, change, or remove the single teacher for a 1v1
 * engagement. See assignTeacher() above for the single-teacher invariant.
 */
export async function setTutoringTeacher(input: {
  courseId: string;
  instructorProfileId: string | null;
}): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('courses')
    .select('id, course_type')
    .eq('id', input.courseId)
    .maybeSingle();
  if (courseError) throw new Error(courseError.message);
  if (!course || course.course_type !== '1v1') throw new Error('1v1 engagement not found.');

  await assignTeacher(admin, input.courseId, input.instructorProfileId);

  revalidatePath('/admin/tutoring');
  revalidatePath(`/admin/tutoring/${input.courseId}`);
  revalidatePath('/instructor/tutoring');
  revalidatePath('/ja/admin/tutoring');
  revalidatePath(`/ja/admin/tutoring/${input.courseId}`);
  revalidatePath('/ja/instructor/tutoring');
}

export interface UpdateSessionReportInput {
  reportId: string;
  sessionDate: string;
  topic: string | null;
  durationMinutes: number | null;
  marginNotes: string | null;
  report: GeneratedSessionReport;
}

/**
 * Save an admin's edits. The full report is re-validated and re-split so
 * student_json and instructor_json can never drift. Allowed in any status;
 * for a published report the student sees the edit immediately (they read
 * student_json). Pattern counts are NOT recomputed — see applyPatternsForReport.
 */
export async function updateSessionReport(
  input: UpdateSessionReportInput,
): Promise<{ ok: true }> {
  const access = await requireTutoringAccessForReport(input.reportId);
  const report = generatedSessionReportSchema.parse(input.report);
  const { instructor_json, student_json } = splitReport(report);

  const admin = createAdminClient();

  const { data: parent, error: pErr } = await admin
    .from('session_reports')
    .update({
      session_date: input.sessionDate,
      topic: input.topic,
      duration_minutes: input.durationMinutes,
      student_json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.reportId)
    .select('course_id')
    .single();
  if (pErr) throw new Error(pErr.message);

  const { error: prErr } = await admin
    .from('session_report_private')
    .update({
      instructor_json,
      margin_notes: input.marginNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('report_id', input.reportId);
  if (prErr) throw new Error(prErr.message);

  await revalidateForReport(admin, parent.course_id, input.reportId);
  return { ok: true };
}

/**
 * Move a published report back to review (hides it from the student — RLS
 * requires 'published'). Needed before regenerating a published report.
 * patterns_applied_at is intentionally NOT reset, so re-publishing never
 * double-counts patterns.
 */
export async function unpublishSessionReport(reportId: string): Promise<{ ok: true }> {
  const access = await requireTutoringAccessForReport(reportId);
  const admin = createAdminClient();
  const { data: parent, error } = await admin
    .from('session_reports')
    .update({ status: 'review', published_at: null, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('status', 'published')
    .select('course_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (parent?.course_id) await revalidateForReport(admin, parent.course_id, reportId);
  return { ok: true };
}

/** Delete a report (cascades the private child) and its raw transcript + photos. */
export async function deleteSessionReport(reportId: string): Promise<{ ok: true }> {
  const access = await requireTutoringAccessForReport(reportId);
  const admin = createAdminClient();

  const { data: report } = await admin
    .from('session_reports')
    .select('course_id')
    .eq('id', reportId)
    .maybeSingle();
  const { data: priv } = await admin
    .from('session_report_private')
    .select('transcript_ref, source_image_refs')
    .eq('report_id', reportId)
    .maybeSingle();

  // Best-effort storage cleanup (bucket objects are not FK-cascaded).
  const objectPaths = [
    ...(priv?.transcript_ref ? [priv.transcript_ref] : []),
    ...(((priv?.source_image_refs ?? []) as SourceImageRef[]).map((r) => r.path)),
  ];
  if (objectPaths.length > 0) {
    await admin.storage.from('tutoring-private').remove(objectPaths);
  }

  const { error } = await admin.from('session_reports').delete().eq('id', reportId);
  if (error) throw new Error(error.message);

  if (report?.course_id) await revalidateForReport(admin, report.course_id, reportId);
  return { ok: true };
}
