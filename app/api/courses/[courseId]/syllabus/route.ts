import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminCourseById } from '@/lib/courses/queries';
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

  // Fetch course with curriculum (admin query — no is_published filter)
  const course = await getAdminCourseById(courseId);
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
  const pdfBuffer = await generateSyllabusPdf(course, locale);

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

  // Return the PDF directly
  const filename = `${course.slug}-syllabus-${locale}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
