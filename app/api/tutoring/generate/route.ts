import { NextRequest, NextResponse, after } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateSessionReport, TUTORING_MODEL_ID } from '@/lib/tutoring/generator';
import { splitReport } from '@/lib/tutoring/split';
import { loadPriorPatternLines } from '@/lib/tutoring/patterns';
import type { SessionReportContext } from '@/lib/tutoring/types';

// Opus 4.8 can take minutes on a long transcript — the report generates in an
// after() background task, so give the invocation headroom.
export const maxDuration = 300;

const BUCKET = 'tutoring-private';
const MAX_TRANSCRIPT_CHARS = 300_000;

/**
 * Start report generation. Two modes:
 *   - NEW:        body has courseId + sessionDate + transcript → create a
 *                 report row (status 'generating') + private stub, upload the
 *                 transcript to the private bucket.
 *   - REGENERATE: body has reportId → re-run generation on an existing row
 *                 (blocked once published), reusing the stored transcript.
 * Returns 202 immediately; the report is produced in an after() task.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      reportId?: string;
      courseId?: string;
      sessionDate?: string;
      topic?: string | null;
      durationMinutes?: number | null;
      transcript?: string;
      marginNotes?: string | null;
    };

    const admin = createAdminClient();

    let reportId: string;
    let courseId: string;
    let studentId: string;
    let sessionDate: string;
    let topic: string | null;
    let durationMinutes: number | null;
    let transcript: string;

    if (body.reportId) {
      // ---- REGENERATE ----
      const { data: report } = await admin
        .from('session_reports')
        .select('id, course_id, student_id, session_date, topic, duration_minutes, status')
        .eq('id', body.reportId)
        .maybeSingle();
      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      if (report.status === 'published') {
        return NextResponse.json(
          { error: 'Unpublish the report before regenerating.' },
          { status: 409 },
        );
      }

      const { data: priv } = await admin
        .from('session_report_private')
        .select('transcript_ref')
        .eq('report_id', report.id)
        .maybeSingle();
      if (!priv?.transcript_ref) {
        return NextResponse.json(
          { error: 'No stored transcript to regenerate from.' },
          { status: 400 },
        );
      }
      const { data: blob, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(priv.transcript_ref);
      if (dlErr || !blob) {
        return NextResponse.json({ error: 'Failed to load stored transcript.' }, { status: 500 });
      }
      transcript = await blob.text();

      reportId = report.id;
      courseId = report.course_id;
      studentId = report.student_id;
      sessionDate = report.session_date;
      topic = report.topic;
      durationMinutes = report.duration_minutes;

      await admin
        .from('session_reports')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('id', reportId);
      await admin
        .from('session_report_private')
        .update({ generation_error: null, updated_at: new Date().toISOString() })
        .eq('report_id', reportId);
    } else {
      // ---- NEW ----
      if (!body.courseId) {
        return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
      }
      if (!body.sessionDate) {
        return NextResponse.json({ error: 'sessionDate is required' }, { status: 400 });
      }
      if (!body.transcript || body.transcript.trim().length === 0) {
        return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
      }
      if (body.transcript.length > MAX_TRANSCRIPT_CHARS) {
        return NextResponse.json(
          { error: `Transcript too long (max ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters).` },
          { status: 400 },
        );
      }

      const { data: course } = await admin
        .from('courses')
        .select('id, course_type')
        .eq('id', body.courseId)
        .maybeSingle();
      if (!course || course.course_type !== '1v1') {
        return NextResponse.json({ error: 'Not a 1v1 course.' }, { status: 400 });
      }

      const { data: enr } = await admin
        .from('enrollments')
        .select('user_id')
        .eq('course_id', body.courseId)
        .eq('status', 'active')
        .limit(1);
      const resolvedStudent = enr?.[0]?.user_id as string | undefined;
      if (!resolvedStudent) {
        return NextResponse.json(
          { error: 'No active student is enrolled in this course.' },
          { status: 400 },
        );
      }

      courseId = body.courseId;
      studentId = resolvedStudent;
      sessionDate = body.sessionDate;
      topic = body.topic ?? null;
      durationMinutes = body.durationMinutes ?? null;
      transcript = body.transcript;

      const { data: inserted, error: insErr } = await admin
        .from('session_reports')
        .insert({
          course_id: courseId,
          student_id: studentId,
          session_date: sessionDate,
          topic,
          duration_minutes: durationMinutes,
          status: 'generating',
          created_by: user.id,
        })
        .select('id')
        .single();
      if (insErr || !inserted) {
        return NextResponse.json({ error: 'Failed to create report row.' }, { status: 500 });
      }
      reportId = inserted.id;

      const transcriptRef = `${courseId}/${reportId}/transcript.txt`;
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(transcriptRef, Buffer.from(transcript, 'utf-8'), {
          contentType: 'text/plain; charset=utf-8',
          upsert: true,
        });
      if (upErr) {
        // Roll back the orphan row so we don't leave a generating report with
        // no transcript to regenerate from.
        await admin.from('session_reports').delete().eq('id', reportId);
        return NextResponse.json(
          { error: `Failed to store transcript: ${upErr.message}` },
          { status: 500 },
        );
      }

      await admin.from('session_report_private').insert({
        report_id: reportId,
        transcript_ref: transcriptRef,
        margin_notes: body.marginNotes ?? null,
        model_id: TUTORING_MODEL_ID,
      });
    }

    // Context for generation (fetched once, closed over by the after() task).
    const { data: courseRow } = await admin
      .from('courses')
      .select('title_en')
      .eq('id', courseId)
      .maybeSingle();
    const { data: studentRow } = await admin
      .from('users')
      .select('full_name')
      .eq('id', studentId)
      .maybeSingle();
    const courseTitleEn = courseRow?.title_en ?? '1v1 Tutoring';
    const studentName = studentRow?.full_name ?? null;

    after(async () => {
      try {
        const priorPatterns = await loadPriorPatternLines(admin, courseId, studentId, 10);
        const context: SessionReportContext = {
          courseTitleEn,
          studentName,
          sessionDate,
          topic,
          durationMinutes,
          transcript,
          priorPatterns,
        };
        const full = await generateSessionReport(context);
        const { instructor_json, student_json } = splitReport(full);

        await admin
          .from('session_reports')
          .update({ student_json, status: 'review', updated_at: new Date().toISOString() })
          .eq('id', reportId);
        await admin.from('session_report_private').upsert(
          {
            report_id: reportId,
            instructor_json,
            generation_error: null,
            model_id: TUTORING_MODEL_ID,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'report_id' },
        );
      } catch (err) {
        console.error(`[Tutoring Generate] Failed for report ${reportId}:`, err);
        await admin
          .from('session_reports')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', reportId);
        await admin.from('session_report_private').upsert(
          {
            report_id: reportId,
            generation_error: err instanceof Error ? err.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'report_id' },
        );
      }
    });

    return NextResponse.json({ reportId }, { status: 202 });
  } catch (error) {
    console.error('[Tutoring Generate] Error:', error);
    return NextResponse.json({ error: 'Failed to start report generation.' }, { status: 500 });
  }
}
