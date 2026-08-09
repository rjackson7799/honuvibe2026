// POST /api/admin/blue-filler/ideas/[id]/kill-memo — adversarial kill memo.
//
// Synchronous Pattern A (Sonnet 5, no web search). SUCCESS-ONLY OVERWRITE: a
// failed generation returns a curated 502 and leaves whatever memo was already
// stored untouched. Archived ideas are 409 — an archived idea is not worth
// spending on.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  BlueFillerProviderError,
  generateKillMemo,
  GENERATION_MODEL,
} from '@/lib/blue-filler/generator';
import { BF_PIPELINE_VERSION } from '@/lib/blue-filler/types';
import type { BlueFillerIdea, KillMemo } from '@/lib/blue-filler/types';

export const maxDuration = 60;
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

  const t0 = Date.now();
  let generated;
  try {
    generated = await generateKillMemo(idea as BlueFillerIdea);
  } catch (err) {
    console.error(`[blue-filler/kill-memo] generation failed for ${id}:`, err);
    if (err instanceof BlueFillerProviderError) {
      return NextResponse.json(
        { error: 'Kill memo generation failed. The previous memo is unchanged.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: 'Failed to generate the kill memo.' }, { status: 500 });
  }

  const killMemo: KillMemo = {
    ...generated,
    model_id: GENERATION_MODEL,
    pipeline_version: BF_PIPELINE_VERSION,
    generated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from('blue_filler_ideas')
    .update({ kill_memo: killMemo, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error(`[blue-filler/kill-memo] save failed for ${id}:`, error);
    return NextResponse.json({ error: 'Failed to save the kill memo.' }, { status: 500 });
  }

  console.log(
    `[blue-filler/kill-memo] idea=${id} lean=${killMemo.verdict_lean} flaws=${killMemo.fatal_flaws.length} ms=${Date.now() - t0}`,
  );
  return NextResponse.json({ kill_memo: killMemo });
}
