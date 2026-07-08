'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { publicEventBySlug } from '@/lib/events/public-events';
import { eventSurveySlug } from '@/lib/survey/event-surveys';
import {
  questionInputSchema,
  eventSurveyInputSchema,
  type QuestionInput,
  type QuestionParsed,
  type EventSurveyInput,
} from '@/lib/admin/event-survey-schema';

type Admin = ReturnType<typeof createAdminClient>;

/** Re-check admin on every mutation (server actions are public endpoints). */
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

// Question CRUD below is GENERIC over survey kind (event + course): the locking
// check and revalidation resolve the survey's kind and use the right responses
// table / builder path.
async function responseCount(supabase: Admin, surveyId: string): Promise<number> {
  const { data: meta } = await supabase
    .from('surveys')
    .select('kind')
    .eq('id', surveyId)
    .maybeSingle();
  const table = meta?.kind === 'course' ? 'course_survey_responses' : 'event_survey_responses';
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function optionValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
    .map((o) => String(o.value ?? ''))
    .filter(Boolean);
}

/** Map a validated question to DB columns (snake_case + normalized). */
function toQuestionRow(q: QuestionParsed) {
  const options =
    q.qtype === 'text'
      ? []
      : q.options.map((o) => ({ value: o.value, label_en: o.labelEn, label_jp: o.labelJp }));
  return {
    qtype: q.qtype,
    prompt_en: q.promptEn,
    prompt_jp: q.promptJp,
    help_en: q.helpEn ?? null,
    help_jp: q.helpJp ?? null,
    required: q.required,
    max_select: q.qtype === 'multi' ? q.maxSelect ?? null : null,
    options,
  };
}

const ADMIN_PATH = '/admin/event-surveys';

function revalidateSurvey(eventSlug?: string | null) {
  revalidatePath(ADMIN_PATH);
  if (eventSlug) revalidatePath(`${ADMIN_PATH}/${eventSlug}`);
}

// --- Survey + settings -------------------------------------------------------

/** Create or update the event survey row + its private settings, atomically-ish. */
export async function upsertEventSurvey(input: EventSurveyInput): Promise<{ surveyId: string }> {
  await requireAdmin();
  const d = eventSurveyInputSchema.parse(input);

  if (!publicEventBySlug(d.eventSlug)) throw new Error('Unknown event');

  const supabase = createAdminClient();

  const { data: existing, error: selErr } = await supabase
    .from('surveys')
    .select('id')
    .eq('kind', 'event')
    .eq('event_slug', d.eventSlug)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  // Activation guard: a survey can't go live without at least one question.
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
        slug: eventSurveySlug(d.eventSlug),
        kind: 'event',
        event_slug: d.eventSlug,
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

  const { error: setErr } = await supabase.from('event_survey_settings').upsert(
    {
      survey_id: surveyId,
      presenter_email: d.presenterEmail,
      presenter_locale: d.presenterLocale,
      opens_at: d.opensAt,
      closes_at: d.closesAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'survey_id' },
  );
  if (setErr) throw new Error(setErr.message);

  revalidateSurvey(d.eventSlug);
  return { surveyId };
}

// --- Questions ---------------------------------------------------------------

export async function createQuestion(
  surveyId: string,
  input: QuestionInput,
): Promise<{ id: string }> {
  await requireAdmin();
  const q = questionInputSchema.parse(input);
  const supabase = createAdminClient();

  // Append after the current max position (robust to gaps left by deletes).
  const { data: maxRow, error: maxErr } = await supabase
    .from('survey_questions')
    .select('position')
    .eq('survey_id', surveyId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(maxErr.message);
  const position = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('survey_questions')
    .insert({ survey_id: surveyId, position, ...toQuestionRow(q) })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  await revalidateForSurvey(supabase, surveyId);
  return { id: data.id };
}

export async function updateQuestion(questionId: string, input: QuestionInput): Promise<void> {
  await requireAdmin();
  const q = questionInputSchema.parse(input);
  const supabase = createAdminClient();

  const { data: existing, error: exErr } = await supabase
    .from('survey_questions')
    .select('survey_id, qtype, options')
    .eq('id', questionId)
    .single();
  if (exErr) throw new Error(exErr.message);

  // Once responses exist, structure/semantics are locked (text edits still ok).
  if ((await responseCount(supabase, existing.survey_id)) > 0) {
    if (q.qtype !== existing.qtype) {
      throw new Error('Cannot change question type after responses exist.');
    }
    const newValues = new Set(q.options.map((o) => o.value));
    for (const v of optionValues(existing.options)) {
      if (!newValues.has(v)) {
        throw new Error('Cannot remove or rename options after responses exist — add new ones instead.');
      }
    }
  }

  const { error } = await supabase
    .from('survey_questions')
    .update({ ...toQuestionRow(q), updated_at: new Date().toISOString() })
    .eq('id', questionId);
  if (error) throw new Error(error.message);

  await revalidateForSurvey(supabase, existing.survey_id);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing, error: exErr } = await supabase
    .from('survey_questions')
    .select('survey_id')
    .eq('id', questionId)
    .single();
  if (exErr) throw new Error(exErr.message);

  if ((await responseCount(supabase, existing.survey_id)) > 0) {
    throw new Error('Cannot delete a question after responses exist.');
  }

  const { error } = await supabase.from('survey_questions').delete().eq('id', questionId);
  if (error) throw new Error(error.message);

  await revalidateForSurvey(supabase, existing.survey_id);
}

export async function reorderQuestions(surveyId: string, orderedIds: string[]): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('reorder_survey_questions', {
    p_survey_id: surveyId,
    p_ids: orderedIds,
  });
  if (error) throw new Error(error.message);
  await revalidateForSurvey(supabase, surveyId);
}

/** Revalidate the right builder page for a survey (event or course). */
async function revalidateForSurvey(supabase: Admin, surveyId: string): Promise<void> {
  const { data } = await supabase
    .from('surveys')
    .select('kind, event_slug, course_id')
    .eq('id', surveyId)
    .maybeSingle();
  if (data?.kind === 'course') {
    revalidatePath('/admin/course-surveys');
    if (data.course_id) revalidatePath(`/admin/course-surveys/${data.course_id}`);
  } else {
    revalidateSurvey(data?.event_slug ?? null);
  }
}
