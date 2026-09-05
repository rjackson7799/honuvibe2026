// /api/admin/engagements/[id]/brief — C2, a near-literal fork of the audit
// route (app/api/admin/studio-leads/[id]/audit/route.ts):
//   POST  regenerate: validate → flip zombies → ATOMIC single-run INSERT (the
//         partial unique index uq_engagement_briefs_one_generating; a double
//         submit becomes a 23505 the route swallows into 409, not a second paid
//         run) → after() job → 202.
//   GET   read briefs + on-read staleness flip (>7 min → failed/timeout).
//         ?poll=1 → { latest } only; otherwise { latest, history }. A query
//         error → 500 (never []).
// Admin-only; every failure path returns JSON.

import { NextRequest, NextResponse, after } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { flipStaleBriefs, runBrief } from '@/lib/studio/engagement/brief';
import { getEngagementBriefs, getLatestEngagementBrief } from '@/lib/admin/queries';
import type { EngagementBriefSummary } from '@/lib/admin/queries';
import type { EngagementBrief } from '@/lib/admin/types';

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

function toSummary(b: EngagementBrief): EngagementBriefSummary {
  return { id: b.id, created_at: b.created_at, status: b.status, questionnaire_id: b.questionnaire_id, generation_error: b.generation_error };
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid engagement id' }, { status: 400 });

  const admin = createAdminClient();
  const { data: q } = await admin
    .from('engagement_questionnaires')
    .select('id, status, answer_snapshot')
    .eq('engagement_id', id)
    .eq('kind', 'discovery')
    .maybeSingle();
  if (!q) return NextResponse.json({ error: 'Engagement or questionnaire not found' }, { status: 404 });
  // A reopened questionnaire keeps its old snapshot, but a brief claimed now
  // would collide with the client's resubmit (the RPC's brief claim hits the
  // one-generating index and the whole submission rolls back). Wait for it.
  if (q.status !== 'submitted') {
    return NextResponse.json({ error: 'The questionnaire is open with the client — wait for the resubmission before regenerating.' }, { status: 409 });
  }
  if (!q.answer_snapshot) {
    return NextResponse.json({ error: 'Nothing to brief yet — the questionnaire has not been submitted.' }, { status: 409 });
  }

  await flipStaleBriefs(admin, id);

  const { data: inserted, error: insErr } = await admin
    .from('engagement_briefs')
    .insert({ engagement_id: id, questionnaire_id: q.id as string, status: 'generating' })
    .select('id')
    .single();
  if (insErr) {
    if (insErr.code === '23505') return NextResponse.json({ error: 'A brief is already generating.' }, { status: 409 });
    console.error('[admin/engagements/brief] insert failed:', insErr);
    return NextResponse.json({ error: 'Failed to start the brief.' }, { status: 500 });
  }
  const briefId = inserted.id as string;

  after(() => runBrief(admin, briefId));

  return NextResponse.json({ briefId }, { status: 202 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid engagement id' }, { status: 400 });

  const admin = createAdminClient();
  const { data: engagement } = await admin.from('engagements').select('id').eq('id', id).maybeSingle();
  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

  await flipStaleBriefs(admin, id);

  const poll = request.nextUrl.searchParams.get('poll') === '1';
  try {
    if (poll) {
      const latest = await getLatestEngagementBrief(id);
      return NextResponse.json({ latest });
    }
    const briefs = await getEngagementBriefs(id, 20);
    return NextResponse.json({ latest: briefs[0] ?? null, history: briefs.map(toSummary) });
  } catch (err) {
    console.error('[admin/engagements/brief] read failed:', err);
    return NextResponse.json({ error: 'Failed to load briefs.' }, { status: 500 });
  }
}
