// /api/admin/prospects/search — Prospect Finder search (Studio, phase 4).
// POST { industry, location }: Places text search → upsert Places data on
// place_id (statuses survive — the payload carries no status) → flip stale
// 'scoring' zombies → claim the scorable rows → after() batch scorer → 202.
// Admin-only; every failure path returns JSON. Node runtime — the scorer's
// safe-fetch uses node:dns/node:net.

import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { normalizeAuditUrl } from '@/lib/studio/audit/crawl';
import { searchPlaces, PlacesError } from '@/lib/studio/prospecting/places';
import { scoreProspects, flipStaleScoring } from '@/lib/studio/prospecting/run';

export const maxDuration = 300;
export const runtime = 'nodejs';

const bodySchema = z.object({
  industry: z.string().trim().min(1).max(100),
  location: z.string().trim().min(1).max(100),
});

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

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: 'Industry and location are both required (max 100 characters).' },
      { status: 400 },
    );
  }

  let results;
  try {
    results = await searchPlaces(`${body.industry} in ${body.location}`);
  } catch (err) {
    if (err instanceof PlacesError && err.code === 'NO_KEY') {
      return NextResponse.json(
        { error: 'Prospecting unavailable — GOOGLE_PLACES_API_KEY is not configured.' },
        { status: 503 },
      );
    }
    console.error('[admin/prospects/search] Places search failed:', err);
    return NextResponse.json(
      { error: 'The Places search failed. Try again in a minute.' },
      { status: 502 },
    );
  }

  if (results.length === 0) {
    return NextResponse.json({ found: 0 });
  }

  const admin = createAdminClient();
  const searchQuery = `${body.industry} in ${body.location}`;

  // Upsert pass — Places-refresh columns ONLY. No status/scoring_started_at in
  // the payload, so existing statuses (converted/dismissed/scoring) survive and
  // new rows get the 'new' default. Website pre-normalized (scoring re-checks).
  const rows = results.map((r) => {
    const norm = r.website ? normalizeAuditUrl(r.website) : null;
    return {
      place_id: r.placeId,
      name: r.name,
      website: r.website === null ? null : norm?.ok ? norm.url : r.website,
      phone: r.phone,
      address: r.address,
      rating: r.rating,
      review_count: r.reviewCount,
      industry: body.industry,
      location: body.location,
      search_query: searchQuery,
    };
  });

  const { error: upsertErr } = await admin
    .from('prospects')
    .upsert(rows, { onConflict: 'place_id' });
  if (upsertErr) {
    // The Places spend is already incurred — surface loudly, do NOT schedule after().
    console.error(
      '[admin/prospects/search] upsert failed (Places spend already incurred):',
      upsertErr,
    );
    return NextResponse.json(
      { error: 'Search succeeded but saving prospects failed.' },
      { status: 500 },
    );
  }

  // Staleness flip — zombie 'scoring' rows from a died invocation unblock here
  // so the claim below can re-score them.
  await flipStaleScoring(admin);

  // Claim pass — this search's rows, excluding converted/dismissed (never
  // re-scored, D3) and rows a live overlapping search already claimed. Each
  // returned row carries the website snapshot it was claimed with — the CAS
  // fence term for its score write.
  const { data: claimed, error: claimErr } = await admin
    .from('prospects')
    .update({
      status: 'scoring',
      scoring_started_at: new Date().toISOString(),
      score: null,
      score_breakdown: null,
      tech: null,
      scored_at: null,
    })
    .in(
      'place_id',
      results.map((r) => r.placeId),
    )
    .not('status', 'in', '(converted,dismissed,scoring)')
    .select('id, website');
  if (claimErr) {
    console.error('[admin/prospects/search] claim failed:', claimErr);
    return NextResponse.json(
      { error: 'Search saved but scheduling scoring failed. Re-run the search.' },
      { status: 500 },
    );
  }

  const workList = (claimed ?? []) as { id: string; website: string | null }[];
  const currentYear = new Date().getFullYear();
  if (workList.length > 0) {
    after(() => scoreProspects(admin, workList, currentYear));
  }

  return NextResponse.json({ found: results.length, scoring: workList.length }, { status: 202 });
}
