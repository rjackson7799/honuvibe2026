/**
 * Shared data access for COURSE surveys (migration 050). A course survey is a
 * `surveys` row with kind='course' bound to a `course_id`. Reuses the generic
 * `survey_questions` manifest (and `getQuestions`) from event-surveys. Private
 * settings live in `course_survey_settings`. Reads via the service-role client;
 * throws on real DB errors (genuine absence returns null).
 */
import { createAdminClient } from '@/lib/supabase/server';
import { getActiveCourses } from '@/lib/admin/queries';
import { getQuestions, type EventSurveyQuestion } from '@/lib/survey/event-surveys';

export type { EventSurveyQuestion } from '@/lib/survey/event-surveys';

export interface CourseSurvey {
  id: string;
  slug: string;
  courseId: string;
  titleEn: string;
  titleJp: string;
  introEn: string | null;
  introJp: string | null;
  isActive: boolean;
}

export interface CourseSurveySettings {
  surveyId: string;
  generateStudentProfile: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface CourseSurveyStatus {
  courseId: string;
  courseTitle: string;
  surveyId: string | null;
  isActive: boolean;
  questionCount: number;
  responseCount: number;
  closesAt: string | null;
}

/** URL-safe, collision-free registry slug for a course survey. */
export function courseSurveySlug(courseSlug: string): string {
  return `course-${courseSlug}`;
}

interface SurveyRow {
  id: string;
  slug: string;
  course_id: string | null;
  title_en: string;
  title_jp: string;
  intro_en: string | null;
  intro_jp: string | null;
  is_active: boolean;
}
interface SettingsRow {
  survey_id: string;
  generate_student_profile: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

const SURVEY_COLS = 'id, slug, course_id, title_en, title_jp, intro_en, intro_jp, is_active';
const SETTINGS_COLS = 'survey_id, generate_student_profile, opens_at, closes_at';

function mapSurvey(row: SurveyRow): CourseSurvey {
  return {
    id: row.id,
    slug: row.slug,
    courseId: row.course_id ?? '',
    titleEn: row.title_en,
    titleJp: row.title_jp,
    introEn: row.intro_en,
    introJp: row.intro_jp,
    isActive: row.is_active,
  };
}
function mapSettings(row: SettingsRow): CourseSurveySettings {
  return {
    surveyId: row.survey_id,
    generateStudentProfile: row.generate_student_profile,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
  };
}

/** The course survey for a course id, or null if none exists. */
export async function getCourseSurvey(courseId: string): Promise<CourseSurvey | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('surveys')
    .select(SURVEY_COLS)
    .eq('kind', 'course')
    .eq('course_id', courseId)
    .maybeSingle();
  if (error) throw new Error(`getCourseSurvey(${courseId}): ${error.message}`);
  return data ? mapSurvey(data as SurveyRow) : null;
}

/** The course survey for a slug (public route), or null. */
export async function getCourseSurveyBySlug(slug: string): Promise<CourseSurvey | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('surveys')
    .select(SURVEY_COLS)
    .eq('kind', 'course')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`getCourseSurveyBySlug(${slug}): ${error.message}`);
  return data ? mapSurvey(data as SurveyRow) : null;
}

export async function getCourseSurveySettings(
  surveyId: string,
): Promise<CourseSurveySettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('course_survey_settings')
    .select(SETTINGS_COLS)
    .eq('survey_id', surveyId)
    .maybeSingle();
  if (error) throw new Error(`getCourseSurveySettings(${surveyId}): ${error.message}`);
  return data ? mapSettings(data as SettingsRow) : null;
}

export async function getCourseResponseCount(surveyId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('course_survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId);
  if (error) throw new Error(`getCourseResponseCount(${surveyId}): ${error.message}`);
  return count ?? 0;
}

export interface CourseSummaryDelivery {
  status: 'pending' | 'sending' | 'sent' | 'failed' | null;
  sentAt: string | null;
  lastError: string | null;
}

/** Instructor-summary delivery state for a survey (admin display). */
export async function getCourseSummaryDelivery(surveyId: string): Promise<CourseSummaryDelivery> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('course_survey_summary_delivery')
    .select('status, sent_at, last_error')
    .eq('survey_id', surveyId)
    .maybeSingle();
  if (error) throw new Error(`getCourseSummaryDelivery(${surveyId}): ${error.message}`);
  return {
    status: (data?.status as CourseSummaryDelivery['status']) ?? null,
    sentAt: (data?.sent_at as string | null) ?? null,
    lastError: (data?.last_error as string | null) ?? null,
  };
}

/** Survey + questions + settings for a course id (builder). */
export async function getCourseSurveyBundle(courseId: string): Promise<{
  survey: CourseSurvey;
  questions: EventSurveyQuestion[];
  settings: CourseSurveySettings | null;
} | null> {
  const survey = await getCourseSurvey(courseId);
  if (!survey) return null;
  const [questions, settings] = await Promise.all([
    getQuestions(survey.id),
    getCourseSurveySettings(survey.id),
  ]);
  return { survey, questions, settings };
}

/** All active courses with their survey status, for the admin list. */
export async function getCourseSurveyStatuses(): Promise<CourseSurveyStatus[]> {
  const supabase = createAdminClient();
  const courses = await getActiveCourses();

  const { data: surveyRows, error } = await supabase
    .from('surveys')
    .select('id, course_id, is_active')
    .eq('kind', 'course');
  if (error) throw new Error(`getCourseSurveyStatuses surveys: ${error.message}`);

  const surveys = (surveyRows ?? []) as Array<{
    id: string;
    course_id: string | null;
    is_active: boolean;
  }>;
  const ids = surveys.map((s) => s.id);

  const counts = new Map<string, { questions: number; responses: number }>();
  const closesBySurvey = new Map<string, string | null>();
  if (ids.length > 0) {
    const [qRes, rRes, setRes] = await Promise.all([
      supabase.from('survey_questions').select('survey_id').in('survey_id', ids),
      supabase.from('course_survey_responses').select('survey_id').in('survey_id', ids),
      supabase.from('course_survey_settings').select('survey_id, closes_at').in('survey_id', ids),
    ]);
    if (qRes.error) throw new Error(`getCourseSurveyStatuses questions: ${qRes.error.message}`);
    if (rRes.error) throw new Error(`getCourseSurveyStatuses responses: ${rRes.error.message}`);
    if (setRes.error) throw new Error(`getCourseSurveyStatuses settings: ${setRes.error.message}`);

    for (const id of ids) counts.set(id, { questions: 0, responses: 0 });
    for (const row of (qRes.data ?? []) as Array<{ survey_id: string }>) {
      const c = counts.get(row.survey_id);
      if (c) c.questions += 1;
    }
    for (const row of (rRes.data ?? []) as Array<{ survey_id: string }>) {
      const c = counts.get(row.survey_id);
      if (c) c.responses += 1;
    }
    for (const row of (setRes.data ?? []) as Array<{ survey_id: string; closes_at: string | null }>) {
      closesBySurvey.set(row.survey_id, row.closes_at);
    }
  }

  const byCourse = new Map<string, { id: string; is_active: boolean }>();
  for (const s of surveys) if (s.course_id) byCourse.set(s.course_id, { id: s.id, is_active: s.is_active });

  return courses.map((c) => {
    const s = byCourse.get(c.id);
    const cc = s ? counts.get(s.id) : undefined;
    return {
      courseId: c.id,
      courseTitle: c.title_en,
      surveyId: s?.id ?? null,
      isActive: s?.is_active ?? false,
      questionCount: cc?.questions ?? 0,
      responseCount: cc?.responses ?? 0,
      closesAt: s ? closesBySurvey.get(s.id) ?? null : null,
    };
  });
}
