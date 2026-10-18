import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminCourseById, getCourseWithCurriculum } from '@/lib/courses/queries';
import { getTutoringAccess } from '@/lib/tutoring/auth';
import { generateSyllabusPdf } from '@/lib/syllabus/generate-pdf';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const { searchParams } = request.nextUrl;
  const locale = searchParams.get('locale') ?? 'en';
  const isPreview = searchParams.get('preview') === 'true';

  // Validate locale
  if (locale !== 'en' && locale !== 'ja') {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  // Draft previews require scoped staff access; published PDFs use the catalog.
  if (isPreview) {
    const access = await getTutoringAccess(courseId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const supabase = await createClient();
  const { data: catalogCourse } = await supabase.from('course_catalog').select('slug').eq('id', courseId).maybeSingle();
  const course = isPreview ? await getAdminCourseById(courseId)
    : catalogCourse ? await getCourseWithCurriculum(catalogCourse.slug) : null;
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // For public (non-preview) requests, course must be published
  if (!isPreview && !course.is_published) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Check cached URL (skip for preview)
  const cachedUrl = locale === 'ja' ? course.syllabus_url_jp : course.syllabus_url_en;
  if (!isPreview && cachedUrl) {
    return NextResponse.redirect(cachedUrl);
  }

  // Generate PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateSyllabusPdf(course, locale);
  } catch (err) {
    console.error('[syllabus] PDF generation failed:', err);
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }

  // A draft preview must never become a publicly cached artifact.
  if (!isPreview) {
    // Upload to Supabase Storage and cache the URL
    const storagePath = `${courseId}/syllabus-${locale}.pdf`;
    const adminClient = createAdminClient();

    const { error: uploadError } = await adminClient.storage
      .from('course-syllabi')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (!uploadError) {
      const { data: publicUrlData } = adminClient.storage
        .from('course-syllabi')
        .getPublicUrl(storagePath);

      if (publicUrlData?.publicUrl) {
        // Update cached URL on course record
        const urlColumn = locale === 'ja' ? 'syllabus_url_jp' : 'syllabus_url_en';
        await adminClient
          .from('courses')
          .update({ [urlColumn]: publicUrlData.publicUrl })
          .eq('id', courseId);
      }
    }

    }

  // Return the PDF directly
  const filename = `${course.slug}-syllabus-${locale}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': isPreview ? 'private, no-store' : 'public, max-age=3600',
    },
  });
}
