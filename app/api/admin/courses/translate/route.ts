import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminCourseById } from '@/lib/courses/queries';
import { buildTranslationInput, translateCourseContent } from '@/lib/courses/translator';
import { revalidatePath } from 'next/cache';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Admin check
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const { courseId } = (await request.json()) as { courseId: string };

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // Fetch full course with curriculum
    const course = await getAdminCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Build translation input and call Claude
    const input = buildTranslationInput(course);
    const output = await translateCourseContent(input);

    // Write translations back to database

    // 1. Update course-level _jp fields
    const { error: courseError } = await supabase
      .from('courses')
      .update({
        title_jp: output.course.title_jp,
        description_jp: output.course.description_jp,
        learning_outcomes_jp: output.course.learning_outcomes_jp,
        prerequisites_jp: output.course.prerequisites_jp,
        who_is_for_jp: output.course.who_is_for_jp,
        schedule_notes_jp: output.course.schedule_notes_jp,
        cancellation_policy_jp: output.course.cancellation_policy_jp,
        completion_requirements_jp: output.course.completion_requirements_jp,
        materials_summary_jp: output.course.materials_summary_jp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId);

    if (courseError) throw courseError;

    // 2. Update weeks
    for (const week of output.weeks) {
      await supabase
        .from('course_weeks')
        .update({
          title_jp: week.title_jp,
          subtitle_jp: week.subtitle_jp,
          description_jp: week.description_jp,
        })
        .eq('id', week.id);
    }

    // 3. Update sessions
    for (const week of output.weeks) {
      for (const session of week.sessions) {
        await supabase
          .from('course_sessions')
          .update({
            title_jp: session.title_jp,
            materials_jp: session.materials_jp,
            topics_jp: session.topics_jp,
          })
          .eq('id', session.id);
      }
    }

    // 4. Update assignments
    for (const week of output.weeks) {
      for (const assignment of week.assignments) {
        await supabase
          .from('course_assignments')
          .update({
            title_jp: assignment.title_jp,
            description_jp: assignment.description_jp,
          })
          .eq('id', assignment.id);
      }
    }

    revalidatePath('/learn');
    revalidatePath('/admin/courses');

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
