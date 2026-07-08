/**
 * Shared data access for PRE-EVENT surveys (migration 049).
 *
 * Surveys live in the `surveys` registry with `kind='event'` and an `event_slug`
 * pointing at a code-defined PublicEvent (lib/events/public-events.ts). Private
 * delivery config (presenter email, lifecycle window) lives in the admin-only
 * `event_survey_settings` table — never on the un-RLS'd `surveys` table.
 *
 * Reads use the service-role client. We THROW on real DB errors so an unapplied
 * migration or outage surfaces as an error, not a silent "no survey configured";
 * a genuinely missing/inactive survey returns null/empty.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { PUBLIC_EVENTS, publicEventBySlug } from '@/lib/events/public-events';

export type EventSurveyQType = 'single' | 'multi' | 'text';

export interface EventSurveyOption {
  value: string;
  labelEn: string;
  labelJp: string;
}

export interface EventSurveyQuestion {
  id: string;
  surveyId: string;
  position: number;
  qtype: EventSurveyQType;
  promptEn: string;
  promptJp: string;
  helpEn: string | null;
  helpJp: string | null;
  options: EventSurveyOption[];
  required: boolean;
  maxSelect: number | null;
}

export interface EventSurvey {
  id: string;
  slug: string;
  eventSlug: string;
  titleEn: string;
  titleJp: string;
  introEn: string | null;
  introJp: string | null;
  isActive: boolean;
}

export interface EventSurveySettings {
  surveyId: string;
  presenterEmail: string | null;
  presenterLocale: 'en' | 'ja';
  opensAt: string | null;
  closesAt: string | null;
}

/** One row per PublicEvent for the admin list — events without a survey included. */
export interface EventSurveyStatus {
  eventSlug: string;
  eventTitle: string;
  startsAt: string;
  surveyId: string | null;
  isActive: boolean;
  questionCount: number;
  responseCount: number;
  presenterEmail: string | null;
}

/** Stable, collision-free registry slug for an event survey. */
export function eventSurveySlug(eventSlug: string): string {
  return `event:${eventSlug}`;
}

// --- Row shapes (DB is snake_case; no generated types in this repo) -----------

interface SurveyRow {
  id: string;
  slug: string;
  event_slug: string | null;
  title_en: string;
  title_jp: string;
  intro_en: string | null;
  intro_jp: string | null;
  is_active: boolean;
}

interface QuestionRow {
  id: string;
  survey_id: string;
  position: number;
  qtype: EventSurveyQType;
  prompt_en: string;
  prompt_jp: string;
  help_en: string | null;
  help_jp: string | null;
  options: unknown;
  required: boolean;
  max_select: number | null;
}

interface SettingsRow {
  survey_id: string;
  presenter_email: string | null;
  presenter_locale: 'en' | 'ja';
  opens_at: string | null;
  closes_at: string | null;
}

const SURVEY_COLS = 'id, slug, event_slug, title_en, title_jp, intro_en, intro_jp, is_active';
const QUESTION_COLS =
  'id, survey_id, position, qtype, prompt_en, prompt_jp, help_en, help_jp, options, required, max_select';
const SETTINGS_COLS = 'survey_id, presenter_email, presenter_locale, opens_at, closes_at';

function mapOptions(raw: unknown): EventSurveyOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
    .map((o) => ({
      value: String(o.value ?? ''),
      labelEn: String(o.label_en ?? ''),
      labelJp: String(o.label_jp ?? ''),
    }))
    .filter((o) => o.value !== '');
}

function mapSurvey(row: SurveyRow): EventSurvey {
  return {
    id: row.id,
    slug: row.slug,
    eventSlug: row.event_slug ?? '',
    titleEn: row.title_en,
    titleJp: row.title_jp,
    introEn: row.intro_en,
    introJp: row.intro_jp,
    isActive: row.is_active,
  };
}

function mapQuestion(row: QuestionRow): EventSurveyQuestion {
  return {
    id: row.id,
    surveyId: row.survey_id,
    position: row.position,
    qtype: row.qtype,
    promptEn: row.prompt_en,
    promptJp: row.prompt_jp,
    helpEn: row.help_en,
    helpJp: row.help_jp,
    options: mapOptions(row.options),
    required: row.required,
    maxSelect: row.max_select,
  };
}

function mapSettings(row: SettingsRow): EventSurveySettings {
  return {
    surveyId: row.survey_id,
    presenterEmail: row.presenter_email,
    presenterLocale: row.presenter_locale,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
  };
}

/** The event survey for a given PublicEvent slug, or null if none exists. */
export async function getEventSurvey(eventSlug: string): Promise<EventSurvey | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('surveys')
    .select(SURVEY_COLS)
    .eq('kind', 'event')
    .eq('event_slug', eventSlug)
    .maybeSingle();
  if (error) throw new Error(`getEventSurvey(${eventSlug}): ${error.message}`);
  return data ? mapSurvey(data as SurveyRow) : null;
}

/** Ordered question manifest for a survey id. */
export async function getQuestions(surveyId: string): Promise<EventSurveyQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('survey_questions')
    .select(QUESTION_COLS)
    .eq('survey_id', surveyId)
    .order('position', { ascending: true });
  if (error) throw new Error(`getQuestions(${surveyId}): ${error.message}`);
  return ((data ?? []) as QuestionRow[]).map(mapQuestion);
}

/** Private delivery config for a survey id, or null if not configured yet. */
export async function getEventSurveySettings(
  surveyId: string,
): Promise<EventSurveySettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('event_survey_settings')
    .select(SETTINGS_COLS)
    .eq('survey_id', surveyId)
    .maybeSingle();
  if (error) throw new Error(`getEventSurveySettings(${surveyId}): ${error.message}`);
  return data ? mapSettings(data as SettingsRow) : null;
}

/** Count of submitted responses for a survey (used for question-edit locking). */
export async function getResponseCount(surveyId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('event_survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId);
  if (error) throw new Error(`getResponseCount(${surveyId}): ${error.message}`);
  return count ?? 0;
}

/** Survey + ordered questions + settings for a PublicEvent slug (builder + public form). */
export async function getEventSurveyBundle(eventSlug: string): Promise<{
  survey: EventSurvey;
  questions: EventSurveyQuestion[];
  settings: EventSurveySettings | null;
} | null> {
  const survey = await getEventSurvey(eventSlug);
  if (!survey) return null;
  const [questions, settings] = await Promise.all([
    getQuestions(survey.id),
    getEventSurveySettings(survey.id),
  ]);
  return { survey, questions, settings };
}

/**
 * The event survey bundle for a slug ONLY when it is currently accepting
 * responses: active, has ≥1 question, and `now` is within its window. The
 * window is `[opens_at ?? -∞, closes_at ?? event start]`. Returns null otherwise.
 * Single source of truth for the public page, the submit route, and the
 * confirm-flow CTA.
 */
export async function getOpenEventSurvey(
  eventSlug: string,
  now: Date = new Date(),
): Promise<{
  survey: EventSurvey;
  questions: EventSurveyQuestion[];
  settings: EventSurveySettings | null;
} | null> {
  const bundle = await getEventSurveyBundle(eventSlug);
  if (!bundle || !bundle.survey.isActive || bundle.questions.length === 0) return null;

  const event = publicEventBySlug(eventSlug);
  const opensAt = bundle.settings?.opensAt ? new Date(bundle.settings.opensAt) : null;
  const closesAt = bundle.settings?.closesAt
    ? new Date(bundle.settings.closesAt)
    : event
      ? new Date(event.startsAt)
      : null;

  if (opensAt && now < opensAt) return null;
  if (closesAt && now > closesAt) return null;
  return bundle;
}

export interface PresenterDeliveryStatus {
  eventSlug: string;
  surveyId: string;
  presenterEmail: string | null;
  responseCount: number;
  status: 'pending' | 'sending' | 'sent' | 'failed' | null;
  sentAt: string | null;
  lastError: string | null;
}

/** Presenter-summary delivery state keyed by event slug, for the RSVP admin. */
export async function getPresenterDeliveryStatuses(): Promise<
  Record<string, PresenterDeliveryStatus>
> {
  const supabase = createAdminClient();
  const { data: surveyRows, error } = await supabase
    .from('surveys')
    .select('id, event_slug')
    .eq('kind', 'event');
  if (error) throw new Error(`getPresenterDeliveryStatuses surveys: ${error.message}`);

  const rows = (surveyRows ?? []) as Array<{ id: string; event_slug: string | null }>;
  const ids = rows.map((r) => r.id);
  const out: Record<string, PresenterDeliveryStatus> = {};
  if (ids.length === 0) return out;

  const [setRes, respRes, delRes] = await Promise.all([
    supabase.from('event_survey_settings').select('survey_id, presenter_email').in('survey_id', ids),
    supabase.from('event_survey_responses').select('survey_id').in('survey_id', ids),
    supabase
      .from('event_presenter_summary_delivery')
      .select('survey_id, status, sent_at, last_error')
      .in('survey_id', ids),
  ]);

  const presenter = new Map<string, string | null>(
    ((setRes.data ?? []) as Array<{ survey_id: string; presenter_email: string | null }>).map((s) => [
      s.survey_id,
      s.presenter_email,
    ]),
  );
  const respCount = new Map<string, number>();
  for (const r of (respRes.data ?? []) as Array<{ survey_id: string }>) {
    respCount.set(r.survey_id, (respCount.get(r.survey_id) ?? 0) + 1);
  }
  const delivery = new Map<
    string,
    { status: PresenterDeliveryStatus['status']; sent_at: string | null; last_error: string | null }
  >(
    ((delRes.data ?? []) as Array<{
      survey_id: string;
      status: PresenterDeliveryStatus['status'];
      sent_at: string | null;
      last_error: string | null;
    }>).map((d) => [d.survey_id, { status: d.status, sent_at: d.sent_at, last_error: d.last_error }]),
  );

  for (const r of rows) {
    if (!r.event_slug) continue;
    const d = delivery.get(r.id);
    out[r.event_slug] = {
      eventSlug: r.event_slug,
      surveyId: r.id,
      presenterEmail: presenter.get(r.id) ?? null,
      responseCount: respCount.get(r.id) ?? 0,
      status: d?.status ?? null,
      sentAt: d?.sent_at ?? null,
      lastError: d?.last_error ?? null,
    };
  }
  return out;
}

/** All public events with their survey status, for the admin list page. */
export async function getEventSurveyStatuses(): Promise<EventSurveyStatus[]> {
  const supabase = createAdminClient();

  const { data: surveyRows, error: sErr } = await supabase
    .from('surveys')
    .select('id, event_slug, is_active')
    .eq('kind', 'event');
  if (sErr) throw new Error(`getEventSurveyStatuses surveys: ${sErr.message}`);

  const surveys = (surveyRows ?? []) as Array<{
    id: string;
    event_slug: string | null;
    is_active: boolean;
  }>;
  const ids = surveys.map((s) => s.id);

  // Batch — one query each for settings / question counts / response counts.
  const counts = new Map<string, { questions: number; responses: number }>();
  let presenterBySurvey = new Map<string, string | null>();
  if (ids.length > 0) {
    const [qRes, rRes, setRes] = await Promise.all([
      supabase.from('survey_questions').select('survey_id').in('survey_id', ids),
      supabase.from('event_survey_responses').select('survey_id').in('survey_id', ids),
      supabase.from('event_survey_settings').select('survey_id, presenter_email').in('survey_id', ids),
    ]);
    if (qRes.error) throw new Error(`getEventSurveyStatuses questions: ${qRes.error.message}`);
    if (rRes.error) throw new Error(`getEventSurveyStatuses responses: ${rRes.error.message}`);
    if (setRes.error) throw new Error(`getEventSurveyStatuses settings: ${setRes.error.message}`);

    for (const id of ids) counts.set(id, { questions: 0, responses: 0 });
    for (const row of (qRes.data ?? []) as Array<{ survey_id: string }>) {
      const c = counts.get(row.survey_id);
      if (c) c.questions += 1;
    }
    for (const row of (rRes.data ?? []) as Array<{ survey_id: string }>) {
      const c = counts.get(row.survey_id);
      if (c) c.responses += 1;
    }
    presenterBySurvey = new Map(
      ((setRes.data ?? []) as Array<{ survey_id: string; presenter_email: string | null }>).map(
        (s) => [s.survey_id, s.presenter_email],
      ),
    );
  }

  const bySlug = new Map<string, { id: string; is_active: boolean }>();
  for (const s of surveys) if (s.event_slug) bySlug.set(s.event_slug, { id: s.id, is_active: s.is_active });

  return PUBLIC_EVENTS.map((ev) => {
    const s = bySlug.get(ev.slug);
    const c = s ? counts.get(s.id) : undefined;
    return {
      eventSlug: ev.slug,
      eventTitle: ev.titleEn,
      startsAt: ev.startsAt,
      surveyId: s?.id ?? null,
      isActive: s?.is_active ?? false,
      questionCount: c?.questions ?? 0,
      responseCount: c?.responses ?? 0,
      presenterEmail: s ? presenterBySurvey.get(s.id) ?? null : null,
    };
  });
}
