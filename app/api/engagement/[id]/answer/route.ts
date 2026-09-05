// POST /api/engagement/[id]/answer — the autosave. An API route, NOT a server
// action: a server action re-renders the RSC tree and replays the router cache
// on every resolve, the wrong shape for a write every ~600 ms.
//
//   authorizeSession (cookie for THIS id, secret hash, revoked, expired)
//   → Sec-Fetch-Site check (reject only when present AND cross-site)
//   → defensive body parse (a sendBeacon sets no Content-Type)
//   → validateOneAnswer against the STORED manifest (never trusts the client)
//   → questions_version must match the stored manifest (409 stale_manifest →
//     the client reloads; a stale tab cannot save against a newer manifest)
//   → last-write-wins upsert on (questionnaire_id, question_id), exactly like
//     discovery_responses — no merge logic. Never enforces `required`.
//
// Rate limit: 600 / 1h per questionnaire id, POST-auth — so one client behind
// a corporate NAT can't be starved by a colleague. lib/community/rate-limit.ts
// is an in-memory bucket per function instance; the token is the real defense.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { tryConsume } from '@/lib/community/rate-limit';
import { authorizeSession, isCrossSite } from '@/lib/studio/engagement/session';
import { validateOneAnswer } from '@/lib/studio/engagement/validate-answers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANSWER_LIMIT = 600;
const ANSWER_WINDOW_MS = 60 * 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  question_id: z.string().min(1).max(64),
  answer: z.unknown(),
  other_text: z.string().max(2000).nullish(),
  questions_version: z.number().int().min(1),
});

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'forbidden' }, 403);

  if (isCrossSite(request.headers.get('sec-fetch-site'))) return json({ error: 'forbidden' }, 403);

  // Beacon bodies arrive as text/plain (or with no Content-Type at all).
  let payload: unknown;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);
  const body = parsed.data;

  const auth = await authorizeSession(id);
  if (!auth.ok) {
    const error = auth.status === 410 ? 'expired' : auth.status === 503 ? 'unavailable' : 'forbidden';
    return json({ error }, auth.status);
  }
  const { questionnaire, supabase } = auth;

  if (!tryConsume(`engq-answer:${id}`, ANSWER_LIMIT, ANSWER_WINDOW_MS)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } });
  }

  if (questionnaire.status !== 'sent' && questionnaire.status !== 'in_progress') {
    return json({ error: 'not_open', status: questionnaire.status }, 409);
  }
  if (body.questions_version !== questionnaire.questions_version) {
    return json({ error: 'stale_manifest', questions_version: questionnaire.questions_version }, 409);
  }

  const question = Array.isArray(questionnaire.questions)
    ? questionnaire.questions.find((q) => q.id === body.question_id)
    : undefined;
  const validated = validateOneAnswer(question, body.answer, body.other_text ?? null);
  if (!validated.ok) return json({ error: validated.error }, 400);

  const { error } = await supabase.from('engagement_questionnaire_answers').upsert(
    {
      questionnaire_id: questionnaire.id,
      question_id: body.question_id,
      answer: validated.answer,
      other_text: validated.other_text,
      questions_version: body.questions_version,
    },
    { onConflict: 'questionnaire_id,question_id' },
  );
  if (error) {
    // The answer lock's RAISEs — a submit that won the race, or a manifest
    // that moved between our read and the write.
    if (error.message.includes('stale_manifest')) return json({ error: 'stale_manifest' }, 409);
    if (error.message.includes('questionnaire_not_open')) return json({ error: 'not_open' }, 409);
    console.error('[engagement/answer] upsert failed:', error.message);
    return json({ error: 'save_failed' }, 500);
  }

  return json({ ok: true, saved_at: new Date().toISOString() }, 200);
}
