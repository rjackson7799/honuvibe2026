'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generatedSessionReportSchema } from './schemas';
import { splitReport } from './split';
import type { GeneratedSessionReport } from './types';

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

/** Delete a report (cascades the private child) and its raw transcript object. */
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
    .select('transcript_ref')
    .eq('report_id', reportId)
    .maybeSingle();

  // Best-effort transcript cleanup (bucket object is not FK-cascaded).
  if (priv?.transcript_ref) {
    await admin.storage.from('tutoring-private').remove([priv.transcript_ref]);
  }

  const { error } = await admin.from('session_reports').delete().eq('id', reportId);
  if (error) throw new Error(error.message);

  if (report?.course_id) await revalidateForReport(admin, report.course_id, reportId);
  return { ok: true };
}
