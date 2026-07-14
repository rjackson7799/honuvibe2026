// /api/admin/prospects — Prospect Finder list (Studio, phase 4).
// GET ?status=&q= → { prospects, scoringCount } + on-read staleness flip (no
// cron). scoringCount is UNFILTERED and limit-independent — it is the panel's
// poll-completion signal, so polling can never stop early because active rows
// fell outside the top-200 or a filter hid them. A query error → 500 (never []).

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getProspects, getScoringCount } from '@/lib/admin/queries';
import { flipStaleScoring } from '@/lib/studio/prospecting/run';
import type { ProspectStatus } from '@/lib/admin/types';

export const runtime = 'nodejs';

const PROSPECT_STATUSES: ProspectStatus[] = [
  'new',
  'scoring',
  'scored',
  'score_failed',
  'no_website',
  'converted',
  'dismissed',
];

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

export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const statusParam = request.nextUrl.searchParams.get('status');
  if (statusParam && !PROSPECT_STATUSES.includes(statusParam as ProspectStatus)) {
    return NextResponse.json({ error: 'Unknown status filter.' }, { status: 400 });
  }
  const status = (statusParam as ProspectStatus | null) ?? undefined;
  const q = request.nextUrl.searchParams.get('q')?.slice(0, 80) ?? undefined;

  // No cron: zombie 'scoring' rows >7 min flip to score_failed on read.
  const admin = createAdminClient();
  await flipStaleScoring(admin);

  try {
    const [prospects, scoringCount] = await Promise.all([
      getProspects({ status, search: q }),
      getScoringCount(),
    ]);
    return NextResponse.json({ prospects, scoringCount });
  } catch (err) {
    console.error('[admin/prospects] read failed:', err);
    return NextResponse.json({ error: 'Failed to load prospects.' }, { status: 500 });
  }
}
