import { NextRequest, NextResponse, after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getTutoringAccess, getTutoringAccessForReport } from '@/lib/tutoring/auth';
import { generateSessionReport, TUTORING_MODEL_ID } from '@/lib/tutoring/generator';
import { splitReport } from '@/lib/tutoring/split';
import { loadPriorPatternLines } from '@/lib/tutoring/patterns';
import type { SessionReportContext, SourceImageRef } from '@/lib/tutoring/types';

// Opus 4.8 can take minutes on a long transcript — the report generates in an
// after() background task, so give the invocation headroom.
export const maxDuration = 300;

const BUCKET = 'tutoring-private';
const MAX_TRANSCRIPT_CHARS = 300_000;
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // safety cap; photos are downscaled client-side first
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EDGE = 1568; // re-cap server-side to Anthropic's optimal vision long-edge

type ReportImage = { base64: string; mediaType: string };

/**
 * Download stored worksheet photos and return them as base64 vision blocks.
 * Missing objects are skipped (best-effort), so a partially-cleaned report
 * still regenerates from whatever remains.
 */
async function loadReportImages(
  admin: SupabaseClient,
  refs: SourceImageRef[],
): Promise<ReportImage[]> {
  const out: ReportImage[] = [];
  for (const ref of refs) {
    const { data: blob, error } = await admin.storage.from(BUCKET).download(ref.path);
    if (error || !blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    out.push({ base64: buf.toString('base64'), mediaType: ref.media_type });
  }
  return out;
}

/**
 * Start report generation. Two modes:
 *   - NEW (multipart/form-data): fields + optional worksheet photos → create a
 *     report row (status 'generating') + private stub, upload the transcript
 *     and/or photos to the private bucket. Requires a transcript OR ≥1 photo.
 *   - REGENERATE (JSON, { reportId }): re-run generation on an existing row
 *     (blocked once published), reusing the stored transcript and/or photos.
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
    // Authorization (admin vs. assigned-instructor) is decided below, once we
    // know which course/report this request targets — see the gate calls in
    // each branch. This early check is auth (who), not authz (allowed-to-what).

    // Branch on Content-Type BEFORE reading the body — the body stream can only
    // be consumed once, so we can't call both formData() and json().
    const isMultipart = (request.headers.get('content-type') ?? '').includes(
      'multipart/form-data',
    );

    let reportIdIn: string | undefined;
    let courseIdIn: string | undefined;
    let sessionDateIn: string | undefined;
    let topicIn: string | null = null;
    let durationIn: number | null = null;
    let transcriptIn = '';
    let marginNotesIn: string | null = null;
    let imageFiles: File[] = [];

    if (isMultipart) {
      const form = await request.formData();
      courseIdIn = (form.get('courseId') as string | null)?.trim() || undefined;
      sessionDateIn = (form.get('sessionDate') as string | null)?.trim() || undefined;
      topicIn = (form.get('topic') as string | null)?.trim() || null;
      marginNotesIn = (form.get('marginNotes') as string | null)?.trim() || null;
      transcriptIn = ((form.get('transcript') as string | null) ?? '').trim();
      const durRaw = (form.get('durationMinutes') as string | null)?.trim();
      const durNum = durRaw ? Number(durRaw) : NaN;
      durationIn = Number.isFinite(durNum) && durNum >= 0 ? Math.floor(durNum) : null;
      imageFiles = form
        .getAll('images')
        .filter((e): e is File => e instanceof File && e.size > 0);
    } else {
      const body = (await request.json()) as {
        reportId?: string;
        courseId?: string;
        sessionDate?: string;
        topic?: string | null;
        durationMinutes?: number | null;
        transcript?: string;
        marginNotes?: string | null;
      };
      reportIdIn = body.reportId;
      courseIdIn = body.courseId;
      sessionDateIn = body.sessionDate;
      topicIn = body.topic ?? null;
      durationIn = typeof body.durationMinutes === 'number' ? body.durationMinutes : null;
      transcriptIn = (body.transcript ?? '').trim();
      marginNotesIn = body.marginNotes ?? null;
    }

    const admin = createAdminClient();

    let reportId: string;
    let courseId: string;
    let studentId: string;
    let sessionDate: string;
    let topic: string | null;
    let durationMinutes: number | null;
    let transcript: string;
    let images: ReportImage[] = [];

    if (reportIdIn) {
      // ---- REGENERATE ----
      const gate = await getTutoringAccessForReport(reportIdIn);
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
      }

      const { data: report } = await admin
        .from('session_reports')
        .select('id, course_id, student_id, session_date, topic, duration_minutes, status')
        .eq('id', reportIdIn)
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
        .select('transcript_ref, source_image_refs')
        .eq('report_id', report.id)
        .maybeSingle();
      const imageRefs = (priv?.source_image_refs ?? []) as SourceImageRef[];
      if (!priv?.transcript_ref && imageRefs.length === 0) {
        return NextResponse.json(
          { error: 'No stored transcript or worksheet photos to regenerate from.' },
          { status: 400 },
        );
      }

      transcript = '';
      if (priv?.transcript_ref) {
        const { data: blob, error: dlErr } = await admin.storage
          .from(BUCKET)
          .download(priv.transcript_ref);
        if (dlErr || !blob) {
          return NextResponse.json(
            { error: 'Failed to load stored transcript.' },
            { status: 500 },
          );
        }
        transcript = await blob.text();
      }
      images = await loadReportImages(admin, imageRefs);
      if (!transcript && images.length === 0) {
        // Refs existed but the objects couldn't be loaded — regenerating from
        // empty content would produce a meaningless report.
        return NextResponse.json(
          { error: 'Could not load the stored transcript or worksheet photos to regenerate from.' },
          { status: 500 },
        );
      }

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
      if (!courseIdIn) {
        return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
      }
      const gate = await getTutoringAccess(courseIdIn);
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
      }
      const { access } = gate;

      if (!sessionDateIn || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDateIn)) {
        return NextResponse.json({ error: 'A valid session date is required' }, { status: 400 });
      }

      const hasTranscript = transcriptIn.length > 0;
      if (!hasTranscript && imageFiles.length === 0) {
        return NextResponse.json(
          { error: 'Provide a transcript or at least one worksheet photo.' },
          { status: 400 },
        );
      }
      if (transcriptIn.length > MAX_TRANSCRIPT_CHARS) {
        return NextResponse.json(
          { error: `Transcript too long (max ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters).` },
          { status: 400 },
        );
      }
      if (imageFiles.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `At most ${MAX_IMAGES} worksheet photos per report.` },
          { status: 400 },
        );
      }
      for (const f of imageFiles) {
        if (!ALLOWED_IMAGE_TYPES.has(f.type)) {
          return NextResponse.json(
            { error: `Unsupported image type: ${f.type || 'unknown'}. Use JPEG, PNG, or WebP.` },
            { status: 400 },
          );
        }
        if (f.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: 'Each worksheet photo must be under 8 MB.' },
            { status: 400 },
          );
        }
      }

      const { data: course } = await admin
        .from('courses')
        .select('id, course_type')
        .eq('id', courseIdIn)
        .maybeSingle();
      if (!course || course.course_type !== '1v1') {
        return NextResponse.json({ error: 'Not a 1v1 course.' }, { status: 400 });
      }

      const { data: enr } = await admin
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseIdIn)
        .eq('status', 'active')
        .limit(1);
      const resolvedStudent = enr?.[0]?.user_id as string | undefined;
      if (!resolvedStudent) {
        return NextResponse.json(
          { error: 'No active student is enrolled in this course.' },
          { status: 400 },
        );
      }

      courseId = courseIdIn;
      studentId = resolvedStudent;
      sessionDate = sessionDateIn;
      topic = topicIn;
      durationMinutes = durationIn;
      transcript = transcriptIn;

      const { data: inserted, error: insErr } = await admin
        .from('session_reports')
        .insert({
          course_id: courseId,
          student_id: studentId,
          session_date: sessionDate,
          topic,
          duration_minutes: durationMinutes,
          status: 'generating',
          created_by: access.userId,
        })
        .select('id')
        .single();
      if (insErr || !inserted) {
        return NextResponse.json({ error: 'Failed to create report row.' }, { status: 500 });
      }
      reportId = inserted.id;

      // Upload transcript + photos, tracking every stored object so we can roll
      // back the whole batch (and the orphan row) if any step fails.
      const uploadedPaths: string[] = [];
      const rollback = async () => {
        try {
          if (uploadedPaths.length) await admin.storage.from(BUCKET).remove(uploadedPaths);
        } catch {
          /* best effort */
        }
        try {
          await admin.from('session_reports').delete().eq('id', reportId);
        } catch {
          /* best effort */
        }
      };

      let transcriptRef: string | null = null;
      if (hasTranscript) {
        transcriptRef = `${courseId}/${reportId}/transcript.txt`;
        const { error: upErr } = await admin.storage
          .from(BUCKET)
          .upload(transcriptRef, Buffer.from(transcript, 'utf-8'), {
            contentType: 'text/plain; charset=utf-8',
            upsert: true,
          });
        if (upErr) {
          await rollback();
          return NextResponse.json(
            { error: `Failed to store transcript: ${upErr.message}` },
            { status: 500 },
          );
        }
        uploadedPaths.push(transcriptRef);
      }

      const sourceImageRefs: SourceImageRef[] = [];
      for (let i = 0; i < imageFiles.length; i += 1) {
        let jpeg: Buffer;
        try {
          jpeg = await sharp(Buffer.from(await imageFiles[i].arrayBuffer()))
            .rotate()
            .resize({ width: IMAGE_EDGE, height: IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        } catch {
          await rollback();
          return NextResponse.json(
            { error: `Could not process worksheet photo ${i + 1}. Use a valid JPEG, PNG, or WebP.` },
            { status: 400 },
          );
        }
        const path = `${courseId}/${reportId}/images/${i}.jpg`;
        const { error: imgErr } = await admin.storage
          .from(BUCKET)
          .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true });
        if (imgErr) {
          await rollback();
          return NextResponse.json(
            { error: `Failed to store worksheet photo ${i + 1}: ${imgErr.message}` },
            { status: 500 },
          );
        }
        uploadedPaths.push(path);
        sourceImageRefs.push({ path, media_type: 'image/jpeg' });
        images.push({ base64: jpeg.toString('base64'), mediaType: 'image/jpeg' });
      }

      const { error: privErr } = await admin.from('session_report_private').insert({
        report_id: reportId,
        transcript_ref: transcriptRef,
        source_image_refs: sourceImageRefs,
        margin_notes: marginNotesIn,
        model_id: TUTORING_MODEL_ID,
      });
      if (privErr) {
        await rollback();
        return NextResponse.json(
          { error: `Failed to create report record: ${privErr.message}` },
          { status: 500 },
        );
      }
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
          images: images.length > 0 ? images : undefined,
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
