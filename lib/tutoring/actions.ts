'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generatedSessionReportSchema } from './schemas';
import { splitReport } from './split';
import type { GeneratedSessionReport, SourceImageRef } from './types';

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
      instructor_name: input.instructorName?.trim() || 'Ryan Jackson',
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

  revalidatePath('/admin/tutoring');
  return { courseId: data.id, slug: data.slug };
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
