// POST /api/admin/engagements/[id]/questionnaire/tailor — C1, SYNCHRONOUS.
// One call, one admin (the shape of blue-filler/generate, not the audit's
// 202 + poll). Synchronous does not mean unclaimed: the route sets
// tailoring_status='generating' + tailoring_started_at FIRST (the partial
// unique index turns a double-click into 23505 → 409), runs the model, and
// PERSISTS THE DRAFT THROUGH THE CAS RPC BEFORE RESPONDING — so "what if the
// request dies" costs nothing: a dead request leaves 'generating', and the
// workspace page's flipStaleTailoring (>5 min) flips it to failed/timeout
// with a Re-tailor button, never a stuck spinner.
//
// Errors: 409 if the questionnaire isn't a draft (never overwrite a sent
// instance) or a run is already going; 502 on provider failure with a curated
// message (never echo provider text); 503 on a missing key.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { flipStaleTailoring, runTailoring } from '@/lib/studio/engagement/tailor';
import type { Engagement, EngagementQuestionnaire } from '@/lib/admin/types';

export const maxDuration = 120;
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', status: 401 as const };
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Not authorized', status: 403 as const };
  return { user };
}

const CURATED: Record<string, { status: number; message: string }> = {
  timeout: { status: 502, message: 'Tailoring timed out. Try again — the template draft is untouched.' },
  provider_error: { status: 502, message: 'Tailoring failed on the AI side. Try again in a moment — the template draft is untouched.' },
  malformed_output: { status: 502, message: 'The AI returned an unusable draft. Try again — the template draft is untouched.' },
  too_many_dropped: { status: 502, message: 'The AI tried to drop too many template questions, so its draft was rejected. Try again — the template draft is untouched.' },
  missing_key: { status: 503, message: 'AI tailoring is not configured (ANTHROPIC_API_KEY).' },
  internal: { status: 500, message: 'Tailoring failed. Check the server logs.' },
};

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid engagement id' }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: CURATED.missing_key.message }, { status: 503 });
  }

  const admin = createAdminClient();
  const [{ data: eRow }, { data: qRow }] = await Promise.all([
    admin.from('engagements').select('*').eq('id', id).maybeSingle(),
    admin.from('engagement_questionnaires').select('*').eq('engagement_id', id).eq('kind', 'discovery').maybeSingle(),
  ]);
  const engagement = (eRow ?? null) as Engagement | null;
  const questionnaire = (qRow ?? null) as EngagementQuestionnaire | null;
  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (!questionnaire) return NextResponse.json({ error: 'Draft the questionnaire first.' }, { status: 404 });
  if (questionnaire.status !== 'draft') {
    return NextResponse.json({ error: 'Only a draft can be tailored — start over to re-tailor a sent questionnaire.' }, { status: 409 });
  }

  // Clear a zombie run first so it cannot block a fresh one under the index.
  await flipStaleTailoring(admin, id);

  // The claim. tailoring_status <> 'generating' makes a concurrent double-click
  // lose here (0 rows) or on the partial unique index (23505) — either way 409.
  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from('engagement_questionnaires')
    .update({ tailoring_status: 'generating', tailoring_started_at: startedAt, tailoring_error: null })
    .eq('id', questionnaire.id)
    .eq('status', 'draft')
    .neq('tailoring_status', 'generating')
    .select('id');
  if (claimErr) {
    if (claimErr.code === '23505') return NextResponse.json({ error: 'Tailoring is already running.' }, { status: 409 });
    console.error('[admin/engagements/tailor] claim failed:', claimErr);
    return NextResponse.json({ error: 'Failed to start tailoring.' }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'Tailoring is already running.' }, { status: 409 });
  }

  const result = await runTailoring(
    admin,
    { ...questionnaire, tailoring_status: 'generating', tailoring_started_at: startedAt },
    engagement,
  );

  revalidatePath(`/admin/studio/engagements/${id}`);
  revalidatePath('/admin/studio/engagements');

  if (!result.ok) {
    const curated = CURATED[result.code] ?? CURATED.internal;
    return NextResponse.json({ error: curated.message, code: result.code }, { status: curated.status });
  }
  return NextResponse.json({
    ok: true,
    questionCount: result.questionCount,
    dropped: result.dropped,
    added: result.added,
    keptUnmentioned: result.keptUnmentioned,
    rationale: result.rationale,
    languageLooksRight: result.languageLooksRight,
  });
}
