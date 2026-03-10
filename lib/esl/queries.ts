import { createClient } from '@/lib/supabase/server';
import type {
  ESLLesson,
  ESLLessonWithAudio,
  ESLProgress,
} from './types';

export async function getESLLessonForWeek(
  weekId: string,
): Promise<ESLLessonWithAudio | null> {
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from('esl_lessons')
    .select('*')
    .eq('week_id', weekId)
    .maybeSingle();

  if (!lesson) return null;

  const { data: audio } = await supabase
    .from('esl_audio')
    .select('*')
    .eq('esl_lesson_id', lesson.id);

  return {
    ...lesson,
    audio: audio ?? [],
  } as ESLLessonWithAudio;
}

export async function getESLLessonsForCourse(
  courseId: string,
): Promise<ESLLesson[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('esl_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });

  return (data ?? []) as ESLLesson[];
}

export async function getESLProgress(
  userId: string,
  eslLessonId: string,
): Promise<ESLProgress | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('esl_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('esl_lesson_id', eslLessonId)
    .maybeSingle();

  return data as ESLProgress | null;
}

export async function getESLProgressForCourse(
  userId: string,
  courseId: string,
): Promise<ESLProgress[]> {
  const supabase = await createClient();

  // Get all ESL lesson IDs for this course, then fetch progress
  const { data: lessons } = await supabase
    .from('esl_lessons')
    .select('id')
    .eq('course_id', courseId);

  if (!lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);

  const { data: progress } = await supabase
    .from('esl_progress')
    .select('*')
    .eq('user_id', userId)
    .in('esl_lesson_id', lessonIds);

  return (progress ?? []) as ESLProgress[];
}
