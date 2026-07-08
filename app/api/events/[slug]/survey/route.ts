import { NextResponse, after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { tryConsume } from '@/lib/community/rate-limit';
import { createAdminClient } from '@/lib/supabase/server';
import { publicEventBySlug } from '@/lib/events/public-events';
import { getOpenEventSurvey } from '@/lib/survey/event-surveys';
import { regenerateEventSurveySummary } from '@/lib/survey/event-summary';
import { validateAndSnapshot } from '@/lib/survey/validate-answers';

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 12;
const CONFIRMED = new Set(['confirmed', 'attended', 'no_show']);

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
  if (!tryConsume(`event-survey:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
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

  // Honeypot tripped → fake success.
  if (d.company_url && d.company_url.trim() !== '') {
    return NextResponse.json({ success: true });
  }
  if (Object.keys(d.answers).length > 200) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (!publicEventBySlug(slug)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 404 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const supabase = createAdminClient();

  // Identity: a confirmed RSVP for THIS event whose confirm_token matches.
  const { data: rsvp, error: rsvpErr } = await supabase
    .from('event_rsvps')
    .select('id, status')
    .eq('confirm_token', d.token)
    .eq('event_slug', slug)
    .maybeSingle();
  if (rsvpErr) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (!rsvp || !CONFIRMED.has(rsvp.status)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 });
  }

  // Survey must be open (active + within window).
  const open = await getOpenEventSurvey(slug);
  if (!open) {
    return NextResponse.json({ error: 'closed' }, { status: 403 });
  }

  const result = validateAndSnapshot(open.questions, d.answers);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { error: upErr } = await supabase.from('event_survey_responses').upsert(
    {
      survey_id: open.survey.id,
      rsvp_id: rsvp.id,
      locale: d.locale,
      answers: result.clean,
      answer_snapshot: result.snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'survey_id,rsvp_id' },
  );
  if (upErr) {
    console.error('[Event Survey] upsert failed:', upErr.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Refresh the presenter summary in the background (never blocks the response).
  after(() => regenerateEventSurveySummary(slug));
  return NextResponse.json({ success: true });
}
