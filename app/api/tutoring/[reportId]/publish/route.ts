import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { getTutoringAccessForReport } from '@/lib/tutoring/auth';
import { applyPatternsForReport, type TroubleSpotForPattern } from '@/lib/tutoring/patterns';
import { sendSessionReportReadyEmail } from '@/lib/email/send';
import type { GeneratedSessionReport } from '@/lib/tutoring/types';

function formatSessionDate(sessionDate: string, locale: 'en' | 'ja'): string {
  const d = new Date(`${sessionDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return sessionDate;
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

async function notifyStudent(
  admin: ReturnType<typeof createAdminClient>,
  courseId: string,
  studentId: string,
  sessionDate: string,
): Promise<boolean> {
  const { data: course } = await admin
    .from('courses')
    .select('slug, title_en, title_jp')
    .eq('id', courseId)
    .maybeSingle();
  const { data: student } = await admin
    .from('users')
    .select('email, full_name, locale_preference')
    .eq('id', studentId)
    .maybeSingle();

  if (!course || !student?.email) return false;

  const locale: 'en' | 'ja' = student.locale_preference === 'ja' ? 'ja' : 'en';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const reportUrl = `${siteUrl}/${locale === 'ja' ? 'ja/' : ''}learn/dashboard/${course.slug}?tab=reports`;
  const courseTitle = (locale === 'ja' ? course.title_jp : course.title_en) ?? course.title_en;

  await sendSessionReportReadyEmail({
    locale,
    email: student.email,
    fullName: student.full_name ?? '',
    courseTitle,
    sessionDate: formatSessionDate(sessionDate, locale),
    reportUrl,
  });
  return true;
}

/**
 * Publish a report (review → published): stamp published_at + reviewer, apply
 * the pattern loop once, and email the student. Also serves the manual email
 * re-send: POST { resend: true } on an already-published report re-sends the
 * notification without touching status or pattern counts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;

    const gate = await getTutoringAccessForReport(reportId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const { access } = gate;

    const body = (await request.json().catch(() => ({}))) as { resend?: boolean };

    const admin = createAdminClient();
    const { data: report } = await admin
      .from('session_reports')
      .select('id, course_id, student_id, session_date, status')
      .eq('id', reportId)
      .maybeSingle();
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // ---- Manual re-send on an already-published report ----
    if (body.resend) {
      if (report.status !== 'published') {
        return NextResponse.json(
          { error: 'Only a published report can be re-sent.' },
          { status: 409 },
        );
      }
      const emailed = await notifyStudent(admin, report.course_id, report.student_id, report.session_date);
      return NextResponse.json({ ok: true, emailed });
    }

    // ---- Publish ----
    if (report.status !== 'review') {
      return NextResponse.json(
        { error: `Cannot publish a report in status "${report.status}".` },
        { status: 409 },
      );
    }

    const { data: priv } = await admin
      .from('session_report_private')
      .select('instructor_json')
      .eq('report_id', reportId)
      .maybeSingle();
    const instructorJson = priv?.instructor_json as GeneratedSessionReport | null;
    if (!instructorJson) {
      return NextResponse.json(
        { error: 'Report has no generated content to publish.' },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    // Atomic review→published flip: the .eq('status','review') guard means only
    // one concurrent publish wins, so the pattern loop below runs exactly once.
    const { data: flipped } = await admin
      .from('session_reports')
      .update({ status: 'published', published_at: nowIso, updated_at: nowIso })
      .eq('id', reportId)
      .eq('status', 'review')
      .select('id')
      .maybeSingle();
    if (!flipped) {
      return NextResponse.json({ error: 'Report was already published.' }, { status: 409 });
    }
    await admin
      .from('session_report_private')
      .update({ reviewed_by: access.userId, reviewed_at: nowIso, updated_at: nowIso })
      .eq('report_id', reportId);

    // Side effects run AFTER the status flip commits — the student can already
    // see the report, so a failure here must NOT report the publish as failed
    // (which would strand the row: it's published, but a retry would 409).
    let emailed = false;
    try {
      // Pattern loop (also idempotent via the patterns_applied_at guard).
      const troubleSpots: TroubleSpotForPattern[] = (instructorJson.trouble_spots ?? []).map((t) => ({
        pattern_category: t.pattern_category,
        pattern_label_en: t.pattern_label_en,
        pattern_label_jp: t.pattern_label_jp,
        quote: t.quote,
        correction: t.correction,
      }));
      await applyPatternsForReport(admin, {
        reportId,
        courseId: report.course_id,
        studentId: report.student_id,
        sessionDate: report.session_date,
        troubleSpots,
      });
      emailed = await notifyStudent(admin, report.course_id, report.student_id, report.session_date);
    } catch (sideErr) {
      console.error('[Tutoring Publish] Post-publish side effect failed:', sideErr);
    }

    // Revalidate the student's dashboard (both locales) so the report appears.
    const { data: course } = await admin
      .from('courses')
      .select('slug')
      .eq('id', report.course_id)
      .maybeSingle();
    if (course?.slug) {
      revalidatePath(`/learn/dashboard/${course.slug}`);
      revalidatePath(`/ja/learn/dashboard/${course.slug}`);
    }
    revalidatePath(`/admin/tutoring/${report.course_id}`);
    revalidatePath(`/admin/tutoring/${report.course_id}/reports/${reportId}`);
    revalidatePath(`/instructor/tutoring/${report.course_id}`);
    revalidatePath(`/instructor/tutoring/${report.course_id}/reports/${reportId}`);
    revalidatePath(`/ja/instructor/tutoring/${report.course_id}`);
    revalidatePath(`/ja/instructor/tutoring/${report.course_id}/reports/${reportId}`);

    return NextResponse.json({ ok: true, emailed });
  } catch (error) {
    console.error('[Tutoring Publish] Error:', error);
    return NextResponse.json({ error: 'Failed to publish report.' }, { status: 500 });
  }
}
