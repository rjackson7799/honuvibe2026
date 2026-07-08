'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { courseSurveySlug, getCourseSurvey } from '@/lib/survey/course-surveys';
import { courseSurveyInputSchema, type CourseSurveyInput } from '@/lib/admin/course-survey-schema';
import { sendCourseSurveyInvite } from '@/lib/email/send';
import { sendCourseSummary } from '@/lib/survey/send-course-summary';

type Admin = ReturnType<typeof createAdminClient>;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') throw new Error('Not authorized');
  return { adminId: user.id };
}

async function questionCount(supabase: Admin, surveyId: string): Promise<number> {
  const { count, error } = await supabase
    .from('survey_questions')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

const ADMIN_PATH = '/admin/course-surveys';

/** Create or update the course survey row + its private settings. */
export async function upsertCourseSurvey(input: CourseSurveyInput): Promise<{ surveyId: string }> {
  await requireAdmin();
  const d = courseSurveyInputSchema.parse(input);

  const supabase = createAdminClient();

  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select('slug')
    .eq('id', d.courseId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!course) throw new Error('Unknown course');

  const { data: existing, error: selErr } = await supabase
    .from('surveys')
    .select('id')
    .eq('kind', 'course')
    .eq('course_id', d.courseId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  if (d.isActive) {
    const qc = existing ? await questionCount(supabase, existing.id) : 0;
    if (qc < 1) throw new Error('Add at least one question before activating the survey.');
  }

  let surveyId: string;
  if (existing) {
    const { error } = await supabase
      .from('surveys')
      .update({
        title_en: d.titleEn,
        title_jp: d.titleJp,
        intro_en: d.introEn ?? null,
        intro_jp: d.introJp ?? null,
        is_active: d.isActive,
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    surveyId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from('surveys')
      .insert({
        slug: courseSurveySlug(course.slug),
        kind: 'course',
        course_id: d.courseId,
        title_en: d.titleEn,
        title_jp: d.titleJp,
        intro_en: d.introEn ?? null,
        intro_jp: d.introJp ?? null,
        is_active: d.isActive,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    surveyId = inserted.id;
  }

  const { error: setErr } = await supabase.from('course_survey_settings').upsert(
    {
      survey_id: surveyId,
      generate_student_profile: d.generateStudentProfile,
      opens_at: d.opensAt,
      closes_at: d.closesAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'survey_id' },
  );
  if (setErr) throw new Error(setErr.message);

  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${d.courseId}`);
  return { surveyId };
}

type Enrollee = {
  user_id: string;
  users: { email: string | null; full_name: string | null; locale_preference: string | null };
};

/**
 * Assign the course's active survey to every active enrollee and email each a
 * tokenized link. Idempotent: re-runs skip already-assigned students (reusing
 * their existing token) rather than erroring on the unique constraint.
 */
export async function assignCourseSurveyToEnrolled(courseId: string): Promise<{
  assigned: number;
  alreadyAssigned: number;
  emailed: number;
  total: number;
}> {
  await requireAdmin();
  const supabase = createAdminClient();

  const survey = await getCourseSurvey(courseId);
  if (!survey) throw new Error('No survey for this course yet.');
  if (!survey.isActive) throw new Error('Activate the survey before assigning it.');

  const { data: course } = await supabase
    .from('courses')
    .select('title_en, title_jp')
    .eq('id', courseId)
    .maybeSingle();
  const titleEn = course?.title_en ?? survey.titleEn;
  const titleJp = course?.title_jp ?? survey.titleJp;

  const { data: enr, error: enrErr } = await supabase
    .from('enrollments')
    .select('user_id, users!inner(email, full_name, locale_preference)')
    .eq('course_id', courseId)
    .eq('status', 'active');
  if (enrErr) throw new Error(enrErr.message);
  const enrollees = (enr ?? []) as unknown as Enrollee[];

  const { data: existing, error: exErr } = await supabase
    .from('survey_assignments')
    .select('user_id, token')
    .eq('survey_id', survey.id);
  if (exErr) throw new Error(exErr.message);
  const tokenByUser = new Map<string, string>(
    ((existing ?? []) as Array<{ user_id: string; token: string }>).map((a) => [a.user_id, a.token]),
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  let assigned = 0;
  let alreadyAssigned = 0;
  const sends: Promise<void>[] = [];

  for (const row of enrollees) {
    const userId = row.user_id;
    const u = row.users;
    if (!u?.email) continue;

    let token = tokenByUser.get(userId);
    if (!token) {
      const { data: ins, error } = await supabase
        .from('survey_assignments')
        .insert({ user_id: userId, survey_id: survey.id })
        .select('token')
        .single();
      if (error || !ins) continue;
      token = ins.token as string;
      assigned += 1;
    } else {
      alreadyAssigned += 1;
    }

    const lang = u.locale_preference === 'ja' ? 'ja' : 'en';
    const url = `${siteUrl}/${lang === 'ja' ? 'ja/' : ''}survey/${survey.slug}?token=${token}`;
    sends.push(
      sendCourseSurveyInvite({
        locale: lang,
        email: u.email,
        fullName: u.full_name ?? '',
        courseTitle: lang === 'ja' ? titleJp : titleEn,
        surveyUrl: url,
      }),
    );
  }

  const results = await Promise.allSettled(sends);
  const emailed = results.filter((r) => r.status === 'fulfilled').length;

  revalidatePath(`${ADMIN_PATH}/${courseId}`);
  return { assigned, alreadyAssigned, emailed, total: enrollees.length };
}

/** Manually (re)send the cohort summary to the course's instructor(s). */
export async function sendCourseSummaryAction(
  surveyId: string,
  courseId: string,
): Promise<{ sent: boolean; reason?: string }> {
  await requireAdmin();
  const res = await sendCourseSummary(surveyId, 'manual', { force: true });
  revalidatePath(`${ADMIN_PATH}/${courseId}`);
  return res;
}
