// POST /api/engagement/[id]/submit — the client's submit.
//
//   rate limit 12 / 1h per IP (matching the course-survey route; the
//   in-memory bucket in lib/community/rate-limit.ts is per function instance —
//   the token is the real defense; the IP is a transient key, never stored)
//   → Sec-Fetch-Site check → honeypot `company_url` (silent fake success, the
//   repo's convention) → authorizeSession → findMissingRequired for a GOOD
//   client-facing error (which section, which question — UX only) → the
//   submit_engagement_questionnaire RPC, which is the single transaction that
//   locks the row, re-checks `required` authoritatively, pins the snapshot,
//   flips to submitted, logs the event and CLAIMS the brief row.
//
// Only on applied:true: email Ryan (stamping notification_sent_at on
// success) and kick the brief generation in after(). A replay returns
// applied:false from the RPC (no second event, snapshot or brief) → 409.

import { NextResponse, type NextRequest, after } from 'next/server';
import { z } from 'zod';
import { tryConsume } from '@/lib/community/rate-limit';
import { authorizeSession, isCrossSite } from '@/lib/studio/engagement/session';
import { findMissingRequired } from '@/lib/studio/engagement/validate-answers';
import { notifySubmission } from '@/lib/studio/engagement/notify';
import { runBrief } from '@/lib/studio/engagement/brief';
import type { Engagement, EngagementQuestionnaire } from '@/lib/admin/types';
import type { StoredAnswer } from '@/lib/studio/engagement/questions-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The brief runs in after(); its provider call is bounded at 90s.
export const maxDuration = 120;

const SUBMIT_LIMIT = 12;
const SUBMIT_WINDOW_MS = 60 * 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  company_url: z.string().max(2000).optional(),
  questions_version: z.number().int().min(1).optional(),
});

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'forbidden' }, 403);

  if (!tryConsume(`engq-submit:${clientIp(request)}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS)) {
    return json({ error: 'rate_limited' }, 429);
  }
  if (isCrossSite(request.headers.get('sec-fetch-site'))) return json({ error: 'forbidden' }, 403);

  let payload: unknown = {};
  try {
    const text = await request.text();
    payload = text.trim() === '' ? {} : JSON.parse(text);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return json({ error: 'invalid_input' }, 400);

  // Honeypot: a bot filled the hidden field. Pretend it worked.
  if (parsed.data.company_url && parsed.data.company_url.trim() !== '') {
    return json({ ok: true, applied: true }, 200);
  }

  const auth = await authorizeSession(id);
  if (!auth.ok) {
    const error = auth.status === 410 ? 'expired' : auth.status === 503 ? 'unavailable' : 'forbidden';
    return json({ error }, auth.status);
  }
  const { questionnaire, supabase } = auth;

  if (questionnaire.status !== 'sent' && questionnaire.status !== 'in_progress') {
    return json({ error: 'not_open', status: questionnaire.status }, 409);
  }
  if (parsed.data.questions_version !== undefined && parsed.data.questions_version !== questionnaire.questions_version) {
    return json({ error: 'stale_manifest', questions_version: questionnaire.questions_version }, 409);
  }

  // UX pre-check: which section, which question. The RPC is the enforcement.
  const { data: answerRows, error: answersErr } = await supabase
    .from('engagement_questionnaire_answers')
    .select('question_id, answer, other_text')
    .eq('questionnaire_id', questionnaire.id)
    .eq('questions_version', questionnaire.questions_version);
  if (answersErr) {
    console.error('[engagement/submit] answers read failed:', answersErr.message);
    return json({ error: 'submit_failed' }, 500);
  }
  const missing = findMissingRequired(questionnaire, (answerRows ?? []) as StoredAnswer[]);
  if (missing.length > 0) return json({ error: 'required_missing', missing }, 400);

  const { data, error } = await supabase.rpc('submit_engagement_questionnaire', { p_questionnaire_id: questionnaire.id });
  if (error) {
    if (error.message.includes('required_missing')) {
      // DETAIL carries the comma-separated ids (PostgREST surfaces it as `details`).
      const ids = String((error as { details?: string }).details ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const byId = new Map(questionnaire.questions.map((q) => [q.id, q.section_key]));
      const groups = new Map<string, string[]>();
      for (const qid of ids) {
        const key = byId.get(qid) ?? '_unsectioned';
        groups.set(key, [...(groups.get(key) ?? []), qid]);
      }
      return json(
        { error: 'required_missing', missing: [...groups.entries()].map(([section_key, question_ids]) => ({ section_key, question_ids })) },
        400,
      );
    }
    if (error.code === '23505') return json({ error: 'brief_in_flight' }, 409);
    console.error('[engagement/submit] RPC failed:', error.message);
    return json({ error: 'submit_failed' }, 500);
  }
  const result = (data ?? {}) as { applied?: boolean; reason?: string; engagement_id?: string; brief_id?: string };
  if (!result.applied) {
    // The row moved between our read and the RPC's lock. Tell the client what
    // it became: 'submitted' renders the thank-you, anything else is a dead link.
    const { data: now } = await supabase.from('engagement_questionnaires').select('status').eq('id', questionnaire.id).maybeSingle();
    return json({ error: result.reason ?? 'not_open', status: (now as { status?: string } | null)?.status ?? null }, 409);
  }

  // Both follow-ups run AFTER the response so the client sees its thank-you at
  // once. Notification is best-effort — the durable signal is the
  // needs_attention event the RPC wrote; the panel shows "resend" while
  // notification_sent_at stays null. The brief claim row already exists.
  const engagementId = result.engagement_id!;
  const briefId = result.brief_id;
  after(async () => {
    const [{ data: freshQ }, { data: eRow }] = await Promise.all([
      supabase.from('engagement_questionnaires').select('*').eq('id', questionnaire.id).maybeSingle(),
      supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle(),
    ]);
    if (freshQ && eRow) {
      await notifySubmission(supabase, freshQ as unknown as EngagementQuestionnaire, eRow as unknown as Engagement);
    }
    if (briefId) await runBrief(supabase, briefId);
  });

  return json({ ok: true, applied: true }, 200);
}
