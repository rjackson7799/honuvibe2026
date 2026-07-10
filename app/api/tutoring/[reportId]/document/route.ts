import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReportForAdmin, getTutoringCourse } from '@/lib/tutoring/queries';
import { buildReportModel, type DocVariant } from '@/lib/tutoring/report-document-model';
import { generateReportPdf } from '@/lib/tutoring/generate-report-pdf';
import { generateReportDocx } from '@/lib/tutoring/generate-report-docx';
import type { GeneratedSessionReport, StudentReport } from '@/lib/tutoring/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PDF_TYPE = 'application/pdf';
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function asciiSlug(name: string): string {
  const cleaned = name.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'student';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const url = new URL(request.url);
    const variant = url.searchParams.get('variant');
    const format = url.searchParams.get('format');

    if (variant !== 'student' && variant !== 'teacher') {
      return NextResponse.json({ error: 'Invalid variant.' }, { status: 400 });
    }
    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ error: 'Invalid format.' }, { status: 400 });
    }

    // Auth: role check first for a clean 403 before any load.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const report = await getReportForAdmin(reportId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // Explicit status guard BEFORE payload presence, so a stale payload on a
    // failed/generating row can never be exported.
    if (report.status !== 'review' && report.status !== 'published') {
      const why = report.status === 'generating'
        ? 'This report is still generating.'
        : report.status === 'failed'
          ? 'This report failed to generate.'
          : `This report cannot be exported (status "${report.status}").`;
      return NextResponse.json({ error: why }, { status: 409 });
    }

    const payload: StudentReport | GeneratedSessionReport | null =
      variant === 'student' ? report.student_json : report.private?.instructor_json ?? null;
    if (!payload) {
      return NextResponse.json({ error: 'This report has no content to export.' }, { status: 409 });
    }

    const course = await getTutoringCourse(report.course_id);
    const studentName = course?.student?.full_name ?? null;

    const model = buildReportModel(variant as DocVariant, {
      payload,
      studentName,
      courseTitleEn: course?.title_en ?? 'Private Tutoring',
      sessionDate: report.session_date,
      topic: report.topic,
      durationMinutes: report.duration_minutes,
      marginNotes: variant === 'teacher' ? report.private?.margin_notes ?? null : null,
    });

    const buffer = format === 'pdf' ? await generateReportPdf(model) : await generateReportDocx(model);

    const suffix = variant === 'teacher' ? '-TEACHER' : '';
    const base = `HonuVibe-1v1-${asciiSlug(studentName ?? 'student')}-${report.session_date}${suffix}`;
    const exactBase = `HonuVibe-1v1-${(studentName ?? 'student')}-${report.session_date}${suffix}`;
    const ext = format;
    const asciiName = `${base}.${ext}`;
    const utf8Name = encodeURIComponent(`${exactBase}.${ext}`);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': format === 'pdf' ? PDF_TYPE : DOCX_TYPE,
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Tutoring Document] Error:', error);
    // Surface the underlying message (admin-only route) so a renderer failure
    // is diagnosable from the UI instead of hiding behind a generic string.
    const detail = error instanceof Error ? error.message : null;
    return NextResponse.json(
      { error: detail ? `Failed to generate document: ${detail}` : 'Failed to generate document.' },
      { status: 500 },
    );
  }
}
