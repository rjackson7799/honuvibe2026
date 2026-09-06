// POST /api/admin/engagements/[id]/proposal/[proposalId]/draft — C3, SYNCHRONOUS
// (the tailor route's shape). The claim is CONDITIONAL and EXCLUSIVE: one
// fenced UPDATE sets drafting_status='generating' + a fresh run id + the
// input version, only while status='draft', no run is live, and the
// content_version is the one this request read — exactly one row or 409. The
// partial unique index is the second wall. While the run is live the guard
// trigger rejects every content save; the finalize RPC requires the run id
// AND content_version = drafting_input_version. The route PERSISTS THROUGH THE
// CAS BEFORE RESPONDING; a dead request leaves 'generating' and
// flipStaleProposalDrafts (>5 min) turns it into failed/timeout.
//
// Errors: 409 not a draft / already running; 502 curated on provider failure
// (never echo provider text); 503 on a missing key.

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { flipStaleProposalDrafts, runProposalDraft } from '@/lib/studio/engagement/proposal-draft';
import type { Engagement, EngagementProposal } from '@/lib/admin/types';

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
  timeout: { status: 502, message: 'Drafting timed out. Re-draft — the proposal is untouched.' },
  provider_error: { status: 502, message: 'Drafting failed on the AI side. Try again in a moment — the proposal is untouched.' },
  malformed_output: { status: 502, message: 'The AI returned an unusable draft. Re-draft — the proposal is untouched.' },
  emitted_price: { status: 502, message: 'The draft mentioned the investment amount — re-draft; the numbers belong in the table.' },
  stale_input: { status: 409, message: 'The proposal changed while the AI was drafting — reload and re-draft.' },
  missing_key: { status: 503, message: 'AI drafting is not configured (ANTHROPIC_API_KEY).' },
  internal: { status: 500, message: 'Drafting failed. Check the server logs.' },
};

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
  const gate = await requireAdmin();
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id, proposalId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(proposalId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: CURATED.missing_key.message }, { status: 503 });
  }

  const admin = createAdminClient();
  const [{ data: eRow }, { data: pRow }] = await Promise.all([
    admin.from('engagements').select('*').eq('id', id).maybeSingle(),
    admin.from('engagement_proposals').select('*').eq('id', proposalId).eq('engagement_id', id).maybeSingle(),
  ]);
  const engagement = (eRow ?? null) as Engagement | null;
  const proposal = (pRow ?? null) as EngagementProposal | null;
  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (proposal.status !== 'draft') {
    return NextResponse.json({ error: 'Only a draft can be re-drafted — click Back to draft first.' }, { status: 409 });
  }
  if (!proposal.brief_id) {
    return NextResponse.json({ error: 'This proposal has no discovery brief to draft from.' }, { status: 409 });
  }

  // Clear a zombie run first so it cannot block a fresh one under the index.
  await flipStaleProposalDrafts(admin, id);

  // The claim: exactly one row, or 409. Fenced on the content_version this
  // request read so the input version recorded is the one the model sees.
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from('engagement_proposals')
    .update({
      drafting_status: 'generating',
      drafting_started_at: startedAt,
      drafting_run_id: runId,
      drafting_input_version: proposal.content_version,
      drafting_error: null,
    })
    .eq('id', proposal.id)
    .eq('status', 'draft')
    .neq('drafting_status', 'generating')
    .eq('content_version', proposal.content_version)
    .select('id');
  if (claimErr) {
    if (claimErr.code === '23505') return NextResponse.json({ error: 'A draft is already running.' }, { status: 409 });
    console.error('[admin/engagements/proposal/draft] claim failed:', claimErr);
    return NextResponse.json({ error: 'Failed to start drafting.' }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'A draft is already running (or the proposal changed — reload).' }, { status: 409 });
  }

  const result = await runProposalDraft(
    admin,
    {
      ...proposal,
      drafting_status: 'generating',
      drafting_started_at: startedAt,
      drafting_run_id: runId,
      drafting_input_version: proposal.content_version,
    },
    engagement,
  );

  revalidatePath(`/admin/studio/engagements/${id}`);
  revalidatePath('/admin/studio/engagements');

  if (!result.ok) {
    const curated = CURATED[result.code] ?? CURATED.internal;
    return NextResponse.json({ error: curated.message, code: result.code }, { status: curated.status });
  }
  return NextResponse.json({ ok: true, languageLooksRight: result.languageLooksRight, confidenceNote: result.confidenceNote });
}
