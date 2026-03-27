import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminCourseById } from '@/lib/courses/queries';
import { generatePresentation } from '@/lib/teaching-materials/generate-presentation';
import type { TeachingMaterialInput } from '@/lib/teaching-materials/types';
import type { CourseSession } from '@/lib/courses/types';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; sessionId: string }> },
) {
  const { courseId, sessionId } = await params;
  const { searchParams } = request.nextUrl;
  const locale = searchParams.get('locale') ?? 'en';

  if (locale !== 'en' && locale !== 'ja') {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Fetch course with curriculum
  const course = await getAdminCourseById(courseId);
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Find the target session
  let session: CourseSession | undefined;
  for (const week of course.weeks) {
    session = week.sessions.find((s) => s.id === sessionId);
    if (session) break;
  }

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Resolve localized fields
  const isJp = locale === 'ja';
  const courseName = (isJp && course.title_jp) ? course.title_jp : course.title_en;
  const sessionTitle = (isJp && session.title_jp) ? session.title_jp : session.title_en;
  const topics = (isJp && session.topics_jp?.length) ? session.topics_jp : session.topics_en ?? [];
  const materials = (isJp && session.materials_jp?.length) ? session.materials_jp : session.materials_en ?? [];
  const description = (isJp && session.description_jp) ? session.description_jp : session.description_en;

  // Resolve instructor name
  const instructorNames = (course.instructors ?? []).length > 0
    ? course.instructors.map((ci) => ci.instructor.display_name).join(', ')
    : course.instructor_name ?? 'Instructor';

  // Find next session for wrap-up slide
  let nextSessionTitle: string | null = null;
  if (session.session_number) {
    for (const week of course.weeks) {
      const next = week.sessions.find((s) => s.session_number === (session!.session_number! + 1));
      if (next) {
        nextSessionTitle = (isJp && next.title_jp) ? next.title_jp : next.title_en;
        break;
      }
    }
  }

  // Find resources linked to this session
  const sessionResources = course.weeks
    .flatMap((w) => w.resources)
    .filter((r) => r.session_id === sessionId);

  const input: TeachingMaterialInput = {
    courseName,
    courseCode: course.course_id_code,
    courseLevel: course.level,
    sessionNumber: session.session_number ?? 0,
    sessionTitle,
    sessionFormat: session.format,
    sessionDuration: session.duration_minutes,
    scheduledAt: session.scheduled_at,
    description,
    topics,
    materials,
    slideDeckUrl: session.slide_deck_url,
    instructorName: instructorNames,
    nextSessionTitle,
    resources: sessionResources,
    locale,
  };

  try {
    const pdfBuffer = await generatePresentation(input);
    const filename = `Session-${session.session_number ?? 0}-Presentation-${locale}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[teaching-materials] Presentation generation failed:', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
