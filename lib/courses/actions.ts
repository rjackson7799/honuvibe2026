'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ParsedCourseData } from './types';

export async function updateCourse(
  courseId: string,
  updates: Record<string, unknown>,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('courses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', courseId);

  if (error) throw error;

  revalidatePath('/learn');
  revalidatePath('/admin/courses');
}

export async function publishCourse(courseId: string) {
  return updateCourse(courseId, {
    is_published: true,
    status: 'published',
  });
}

export async function unpublishCourse(courseId: string) {
  return updateCourse(courseId, {
    is_published: false,
    status: 'draft',
  });
}

export async function archiveCourse(courseId: string) {
  return updateCourse(courseId, {
    is_published: false,
    status: 'archived',
  });
}

export async function updateCourseSession(
  sessionId: string,
  updates: {
    replay_url?: string;
    transcript_url?: string;
    slide_deck_url?: string;
    status?: 'upcoming' | 'live' | 'completed';
  },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('course_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) throw error;

  revalidatePath('/learn');
  revalidatePath('/admin/courses');
}

export async function createCourseFromParsedData(
  parsedData: ParsedCourseData,
  uploadId: string,
  startDate?: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { course, weeks } = parsedData;

  // Insert course
  const { data: newCourse, error: courseError } = await supabase
    .from('courses')
    .insert({
      slug: course.slug,
      course_id_code: course.course_id_code,
      course_type: 'cohort' as const,
      title_en: course.title_en,
      title_jp: course.title_jp,
      description_en: course.description_en,
      description_jp: course.description_jp,
      instructor_name: course.instructor_name,
      price_usd: course.price_usd * 100, // Convert dollars to cents
      price_jpy: course.price_jpy, // JPY is zero-decimal
      language: course.language,
      subtitle_language: course.subtitle_language,
      level: course.level,
      format: course.format,
      start_date: startDate || null,
      total_weeks: course.total_weeks,
      live_sessions_count: course.live_sessions_count,
      recorded_lessons_count: course.recorded_lessons_count,
      max_enrollment: course.max_enrollment,
      learning_outcomes_en: course.learning_outcomes_en,
      learning_outcomes_jp: course.learning_outcomes_jp,
      prerequisites_en: course.prerequisites_en,
      prerequisites_jp: course.prerequisites_jp,
      who_is_for_en: course.who_is_for_en,
      who_is_for_jp: course.who_is_for_jp,
      tools_covered: course.tools_covered,
      community_platform: course.community_platform,
      community_duration_months: course.community_duration_months,
      schedule_notes_en: course.schedule_notes_en,
      schedule_notes_jp: course.schedule_notes_jp,
      cancellation_policy_en: course.cancellation_policy_en,
      cancellation_policy_jp: course.cancellation_policy_jp,
      completion_requirements_en: course.completion_requirements_en,
      completion_requirements_jp: course.completion_requirements_jp,
      materials_summary_en: course.materials_summary,
      tags: course.tags,
      is_published: false,
      status: 'draft' as const,
    })
    .select()
    .single();

  if (courseError || !newCourse) throw courseError || new Error('Failed to create course');

  // Insert weeks and nested content
  for (const week of weeks) {
    const unlockDate = startDate
      ? new Date(
          new Date(startDate).getTime() +
            (week.week_number - 1) * 7 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split('T')[0]
      : null;

    const { data: newWeek, error: weekError } = await supabase
      .from('course_weeks')
      .insert({
        course_id: newCourse.id,
        week_number: week.week_number,
        title_en: week.title_en,
        title_jp: week.title_jp,
        subtitle_en: week.subtitle_en,
        subtitle_jp: week.subtitle_jp,
        description_en: week.description_en,
        phase: week.phase,
        unlock_date: unlockDate,
        is_unlocked: week.week_number === 1,
      })
      .select()
      .single();

    if (weekError || !newWeek) continue;

    // Sessions
    if (week.sessions?.length) {
      await supabase.from('course_sessions').insert(
        week.sessions.map((s) => ({
          week_id: newWeek.id,
          session_number: s.session_number,
          title_en: s.title_en,
          title_jp: s.title_jp,
          format: s.format,
          duration_minutes: s.duration_minutes,
          materials_en: s.materials_en,
          materials_jp: s.materials_jp,
          topics_en: s.topics_en,
          topics_jp: s.topics_jp,
        })),
      );
    }

    // Assignments
    if (week.assignments?.length) {
      await supabase.from('course_assignments').insert(
        week.assignments.map((a, i) => ({
          week_id: newWeek.id,
          sort_order: i + 1,
          title_en: a.title_en,
          title_jp: a.title_jp,
          description_en: a.description_en,
          description_jp: a.description_jp,
          assignment_type: a.assignment_type,
        })),
      );
    }

    // Vocabulary
    if (week.vocabulary?.length) {
      await supabase.from('course_vocabulary').insert(
        week.vocabulary.map((v, i) => ({
          week_id: newWeek.id,
          sort_order: i + 1,
          term_en: v.term_en,
          term_jp: v.term_jp,
        })),
      );
    }

    // Resources
    if (week.resources?.length) {
      await supabase.from('course_resources').insert(
        week.resources.map((r, i) => ({
          week_id: newWeek.id,
          sort_order: i + 1,
          title_en: r.title_en,
          url: r.url,
          resource_type: r.resource_type,
          description_en: r.description_en,
        })),
      );
    }
  }

  // Update upload record
  await supabase
    .from('course_uploads')
    .update({ course_id: newCourse.id, status: 'confirmed' })
    .eq('id', uploadId);

  revalidatePath('/learn');
  revalidatePath('/admin/courses');

  return { courseId: newCourse.id, slug: newCourse.slug };
}
