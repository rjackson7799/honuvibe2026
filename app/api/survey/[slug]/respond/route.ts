import { NextResponse, after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { tryConsume } from '@/lib/community/rate-limit';
import { createAdminClient } from '@/lib/supabase/server';
import { validateSurveyToken } from '@/lib/survey/actions';
import { getCourseSurveyBySlug, getCourseSurveySettings } from '@/lib/survey/course-surveys';
import { getQuestions } from '@/lib/survey/event-surveys';
import { validateAndSnapshot } from '@/lib/survey/validate-answers';
import { regenerateCourseSurveySummary } from '@/lib/survey/course-summary';

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 12;

const schema = z.object({
  token: z.string().min(1).max(100),
  locale: z.enum(['en', 'ja']).default('en'),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  // Honeypot — must stay empty.
  company_url: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  if (!tryConsume(`course-survey:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const d = parsed.data;

  if (d.company_url && d.company_url.trim() !== '') {
    return NextResponse.json({ success: true });
  }
  if (Object.keys(d.answers).length > 200) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Identity: a survey_assignments token bound to THIS course survey.
  const tokenResult = await validateSurveyToken(d.token);
  if (!tokenResult || tokenResult.kind !== 'course' || tokenResult.surveySlug !== slug) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 });
  }

  const survey = await getCourseSurveyBySlug(slug);
  if (!survey) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 });
  }

  // Must be open: active + within [opens_at, closes_at].
  const settings = await getCourseSurveySettings(survey.id);
  const now = Date.now();
  const opensAt = settings?.opensAt ? new Date(settings.opensAt).getTime() : null;
  const closesAt = settings?.closesAt ? new Date(settings.closesAt).getTime() : null;
  if (!survey.isActive || (opensAt && now < opensAt) || (closesAt && now > closesAt)) {
    return NextResponse.json({ error: 'closed' }, { status: 403 });
  }

  const questions = await getQuestions(survey.id);
  const result = validateAndSnapshot(questions, d.answers);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: upErr } = await supabase.from('course_survey_responses').upsert(
    {
      survey_id: survey.id,
      user_id: tokenResult.userId,
      assignment_id: tokenResult.assignmentId,
      locale: d.locale,
      answers: result.clean,
      answer_snapshot: result.snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'survey_id,user_id' },
  );
  if (upErr) {
    console.error('[Course Survey] upsert failed:', upErr.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Mark the assignment completed (tracking only — answers stay editable until close).
  await supabase
    .from('survey_assignments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', tokenResult.assignmentId);

  // Refresh the instructor summary in the background (never blocks the response).
  after(() => regenerateCourseSurveySummary(survey.id));
  return NextResponse.json({ success: true });
}
