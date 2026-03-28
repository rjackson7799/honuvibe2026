'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BonusSessionType, ParsedCourseData } from './types';

export async function invalidateSyllabusCache(courseId: string) {
  const supabase = await createClient();
  await supabase
    .from('courses')
    .update({ syllabus_url_en: null, syllabus_url_jp: null })
    .eq('id', courseId);
}

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

  // Invalidate cached syllabus PDFs when course content changes
  await invalidateSyllabusCache(courseId);

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

/**
 * Permanently delete a course. Only allowed when:
 * - No students are enrolled
 * - Course has not started yet (start_date is in the future or null)
 * All child records (weeks, sessions, assignments, vocabulary, resources, uploads)
 * are cascade-deleted by the database.
 */
export async function deleteCourse(courseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check for enrolled students
  const { count } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (count && count > 0) {
    throw new Error('Cannot delete a course with enrolled students');
  }

  // Check that course hasn't started
  const { data: course } = await supabase
    .from('courses')
    .select('start_date')
    .eq('id', courseId)
    .single();

  if (course?.start_date && new Date(course.start_date) <= new Date()) {
    throw new Error('Cannot delete a course that has already started');
  }

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) throw error;

  revalidatePath('/learn');
  revalidatePath('/admin/courses');
}

export async function updateCourseSession(
  sessionId: string,
  updates: {
    replay_url?: string;
    transcript_url?: string;
    slide_deck_url?: string;
    zoom_link?: string | null;
    instructor_id?: string | null;
    status?: 'upcoming' | 'live' | 'completed';
  },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the course ID via the session's week
  const { data: session } = await supabase
    .from('course_sessions')
    .select('week_id')
    .eq('id', sessionId)
    .single();

  const { error } = await supabase
    .from('course_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) throw error;

  // Invalidate cached syllabus when session content changes
  if (session?.week_id) {
    const { data: week } = await supabase
      .from('course_weeks')
      .select('course_id')
      .eq('id', session.week_id)
      .single();
    if (week?.course_id) {
      await invalidateSyllabusCache(week.course_id);
    }
  }

  revalidatePath('/learn');
  revalidatePath('/admin/courses');
}

export async function createCourseFromParsedData(
  parsedData: ParsedCourseData,
  uploadId: string,
  startDate?: string,
  eslOptions?: {
    eslEnabled?: boolean;
    eslIncluded?: boolean;
    eslPriceUsd?: number;
    eslPriceJpy?: number;
    eslSettings?: Record<string, unknown>;
  },
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
      esl_enabled: eslOptions?.eslEnabled ?? false,
      esl_included: eslOptions?.eslIncluded ?? false,
      esl_price_usd: eslOptions?.eslPriceUsd ?? null,
      esl_price_jpy: eslOptions?.eslPriceJpy ?? null,
      esl_settings_json: eslOptions?.eslSettings ?? null,
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
          course_id: newCourse.id,
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

// --- Bonus Session Actions ---

export async function createBonusSession(
  courseId: string,
  data: {
    bonus_type: BonusSessionType;
    title_en: string;
    title_jp?: string;
    description_en?: string;
    description_jp?: string;
    instructor_id?: string | null;
    zoom_link?: string | null;
    replay_url?: string;
    scheduled_at?: string | null;
    duration_minutes?: number | null;
  },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('course_sessions').insert({
    course_id: courseId,
    is_bonus: true,
    week_id: null,
    session_number: null,
    bonus_type: data.bonus_type,
    title_en: data.title_en,
    title_jp: data.title_jp ?? null,
    description_en: data.description_en ?? null,
    description_jp: data.description_jp ?? null,
    instructor_id: data.instructor_id ?? null,
    zoom_link: data.zoom_link ?? null,
    replay_url: data.replay_url ?? null,
    scheduled_at: data.scheduled_at ?? null,
    duration_minutes: data.duration_minutes ?? null,
    format: 'live' as const,
    status: 'upcoming' as const,
  });

  if (error) throw error;

  revalidatePath('/learn');
  revalidatePath('/admin/courses');
}

export async function updateBonusSession(
  sessionId: string,
  updates: {
    bonus_type?: BonusSessionType;
    title_en?: string;
    title_jp?: string | null;
    description_en?: string | null;
    description_jp?: string | null;
    zoom_link?: string | null;
    replay_url?: string | null;
    transcript_url?: string | null;
    slide_deck_url?: string | null;
    scheduled_at?: string | null;
    duration_minutes?: number | null;
    instructor_id?: string | null;
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

export async function deleteBonusSession(sessionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Safety check: only delete bonus sessions
  const { data: session } = await supabase
    .from('course_sessions')
    .select('is_bonus')
    .eq('id', sessionId)
    .single();

  if (!session?.is_bonus) {
    throw new Error('Cannot delete a curriculum session via this action');
  }

  const { error } = await supabase
    .from('course_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;

  revalidatePath('/learn');
  revalidatePath('/admin/courses');
}
