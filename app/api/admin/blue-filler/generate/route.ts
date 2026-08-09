// POST /api/admin/blue-filler/generate — synchronous idea generation.
//
// IDEMPOTENCY IS ROW-LEVEL, NOT SPEND-LEVEL. A pre-call lookup on request_id
// short-circuits a repeat submit with zero provider spend, and the UNIQUE
// constraint makes a lost race resolve to the winner's row. Two TRULY concurrent
// calls with the same request_id can still both invoke Claude — accepted
// residual risk for a single-admin busy button (typically ~$0.03-0.06, true
// worst case ~$0.15). The multi-user upgrade path is a job table with a claim.
//
// Admin-only; every failure path returns JSON, and no raw provider content ever
// reaches the client.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  BlueFillerProviderError,
  generateIdea,
  GENERATION_MODEL,
  industriesForRequest,
  resolveOrigin,
  resolveSeed,
  slugifyTitle,
} from '@/lib/blue-filler/generator';
import { generateRequestSchema, SEED_MIN_LENGTH } from '@/lib/blue-filler/schemas';
import { computeExitMath, isInThesisBand, scoreIdea } from '@/lib/blue-filler/scoring';
import { getDedupeList, getTasteProfile } from '@/lib/blue-filler/queries';
import { BF_PIPELINE_VERSION, buildSha } from '@/lib/blue-filler/types';
import type { BlueFillerIdea } from '@/lib/blue-filler/types';

export const maxDuration = 120;
export const runtime = 'nodejs';

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

/** Collision suffixes. Retry 1 is 4 base36 chars, retry 2 is 8 uuid chars. */
function randomBase36(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
}

/**
 * The idempotency lookup. A query ERROR is deliberately NOT collapsed into
 * "no row": that would turn a transient DB blip into a second paid generation
 * on the pre-call path, and into a bogus slug retry on the post-23505 path.
 */
async function findByRequestId(
  admin: ReturnType<typeof createAdminClient>,
  requestId: string,
): Promise<{ ok: true; idea: BlueFillerIdea | null } | { ok: false }> {
  const { data, error } = await admin
    .from('blue_filler_ideas')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle();
  if (error) {
    console.error('[blue-filler/generate] request_id lookup failed:', error);
    return { ok: false };
  }
  return { ok: true, idea: (data as BlueFillerIdea | null) ?? null };
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsedBody = generateRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: parsedBody.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      },
      { status: 400 },
    );
  }
  const body = parsedBody.data;

  const seed = resolveSeed(body.source_text, SEED_MIN_LENGTH);
  if (!seed.ok) {
    return NextResponse.json({ error: seed.error }, { status: 400 });
  }

  const admin = createAdminClient();

  // (1) Pre-call lookup — a repeat submit costs nothing.
  const existing = await findByRequestId(admin, body.request_id);
  if (!existing.ok) {
    return NextResponse.json(
      { error: 'Could not check for an existing idea. Please try again.' },
      { status: 500 },
    );
  }
  if (existing.idea) {
    return NextResponse.json({ idea: existing.idea });
  }

  const t0 = Date.now();
  const { industries, targeted } = industriesForRequest(body.industry_key);
  const acquirerMode = body.mode === 'acquirer';

  // (2) Generate.
  let generated;
  try {
    const [taste, dedupe] = await Promise.all([getTasteProfile(), getDedupeList()]);
    generated = await generateIdea({
      industries,
      targeted,
      acquirerMode,
      seedText: seed.seedText,
      taste,
      existing: dedupe,
    });
  } catch (err) {
    console.error('[blue-filler/generate] generation failed:', err);
    if (err instanceof BlueFillerProviderError) {
      return NextResponse.json(
        { error: 'Idea generation failed. Please try again.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: 'Failed to generate an idea.' }, { status: 500 });
  }

  let exitMath;
  try {
    exitMath = computeExitMath(generated.thesis.exit_assumptions);
  } catch (err) {
    console.error('[blue-filler/generate] exit math rejected model assumptions:', err);
    return NextResponse.json(
      { error: 'Idea generation failed. Please try again.' },
      { status: 502 },
    );
  }

  const { composite, grade } = scoreIdea(generated.scores);
  const baseSlug = slugifyTitle(generated.title);

  const row = {
    request_id: body.request_id,
    title: generated.title,
    industry_key: generated.industry_key,
    origin: resolveOrigin(seed.seedText !== null, acquirerMode),
    source_excerpt: seed.excerpt,
    one_liner: generated.one_liner,
    summary_md: generated.summary_md,
    thesis: {
      ...generated.thesis,
      exit_math: exitMath,
      exit_in_thesis_band: isInThesisBand(generated.thesis.exit_assumptions.target_exit_usd),
    },
    gen_scores: generated.scores,
    current_scores: generated.scores,
    composite,
    grade,
    model_id: GENERATION_MODEL,
    pipeline_version: BF_PIPELINE_VERSION,
    build_sha: buildSha(),
  };

  // (3) Insert, classifying every 23505 by re-checking request_id first. The
  // only unique constraints on this table are request_id, slug and the PK, so a
  // request_id miss can only mean a slug collision. At most three attempts —
  // this terminates and never loops.
  const slugs = [baseSlug, `${baseSlug}-${randomBase36(4)}`, `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`];

  for (let attempt = 0; attempt < slugs.length; attempt += 1) {
    const { data, error } = await admin
      .from('blue_filler_ideas')
      .insert({ ...row, slug: slugs[attempt] })
      .select('*')
      .single();

    if (!error) {
      console.log(
        `[blue-filler/generate] idea=${(data as BlueFillerIdea).id} industry=${row.industry_key} origin=${row.origin} grade=${grade} attempts=${attempt + 1} ms=${Date.now() - t0}`,
      );
      return NextResponse.json({ idea: data as BlueFillerIdea });
    }

    if (error.code !== '23505') {
      console.error('[blue-filler/generate] insert failed:', error);
      return NextResponse.json({ error: 'Failed to save the idea.' }, { status: 500 });
    }

    // Our twin may have won the race with this request_id.
    const winner = await findByRequestId(admin, body.request_id);
    if (!winner.ok) {
      return NextResponse.json({ error: 'Failed to save the idea.' }, { status: 500 });
    }
    if (winner.idea) {
      console.log(
        `[blue-filler/generate] idea=${winner.idea.id} resolved-to-twin attempts=${attempt + 1} ms=${Date.now() - t0}`,
      );
      return NextResponse.json({ idea: winner.idea });
    }
    // Otherwise it was a slug collision — the next iteration retries a new slug.
  }

  console.error(
    `[blue-filler/generate] slug collisions exhausted for base "${baseSlug}" with no request_id winner`,
  );
  return NextResponse.json({ error: 'Failed to save the idea.' }, { status: 500 });
}
