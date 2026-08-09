// /api/admin/blue-filler/ideas/[id]/research — web-grounded deep research.
//   POST  start a run: validate → idea exists (archived → 409) → clear zombies →
//         atomic single-run INSERT (partial unique index) → after() job → 202.
//   GET   read runs + on-read staleness flip. ?poll=1 → { latest } only;
//         otherwise { latest, history }. A query error → 500 (never []).
//
// Structure is a clone of app/api/admin/studio-leads/[id]/audit/route.ts.
// Node runtime, maxDuration 300 — the run's own budget (250s) sits inside it,
// and the 8-minute stale flip sits outside it.

import { NextRequest, NextResponse, after } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { flipStaleResearch, runResearch } from '@/lib/blue-filler/research/run';
import {
  getLatestResearchForPoll,
  getResearchHistory,
  toResearchSummary,
} from '@/lib/blue-filler/queries';
import { buildSha } from '@/lib/blue-filler/types';
import type { BlueFillerIdea } from '@/lib/blue-filler/types';

export const maxDuration = 300;
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', status: 401 as const };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Not authorized', status: 403 as const };
  }
  return { user };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid idea id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: idea } = await admin
    .from('blue_filler_ideas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }
  if ((idea as BlueFillerIdea).status === 'archived') {
    return NextResponse.json(
      { error: 'This idea is archived. Un-archive it first.' },
      { status: 409 },
    );
  }

  // Clear zombies first so a stale 'generating' row doesn't block a fresh run
  // under the partial unique index below.
  await flipStaleResearch(admin, id);

  // Atomic single-run guard: uq_blue_filler_research_one_generating turns a
  // concurrent double-POST into a 23505 on the second INSERT (→ 409).
  const { data: inserted, error: insErr } = await admin
    .from('blue_filler_research')
    .insert({ idea_id: id, status: 'generating', build_sha: buildSha() })
    .select('id')
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      return NextResponse.json({ error: 'Research is already running.' }, { status: 409 });
    }
    console.error('[blue-filler/research] insert failed:', insErr);
    return NextResponse.json({ error: 'Failed to start research.' }, { status: 500 });
  }

  const researchId = inserted.id as string;
  after(() => runResearch(admin, researchId, idea as BlueFillerIdea));

  return NextResponse.json({ researchId }, { status: 202 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid idea id' }, { status: 400 });
  }

  // Confirm the idea exists (symmetry with POST — no "valid UUID → empty 200").
  const admin = createAdminClient();
  const { data: idea } = await admin
    .from('blue_filler_ideas')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  // No cron: zombie 'generating' rows flip to 'failed' on read.
  await flipStaleResearch(admin, id);

  const poll = request.nextUrl.searchParams.get('poll') === '1';
  try {
    if (poll) {
      // Narrow projection: the poll never carries raw_findings_md.
      const latest = await getLatestResearchForPoll(id);
      return NextResponse.json({ latest });
    }
    const history = await getResearchHistory(id);
    return NextResponse.json({
      latest: history[0] ?? null,
      history: history.map(toResearchSummary),
    });
  } catch (err) {
    console.error('[blue-filler/research] read failed:', err);
    return NextResponse.json({ error: 'Failed to load research.' }, { status: 500 });
  }
}
