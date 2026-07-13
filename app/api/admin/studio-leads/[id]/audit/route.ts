// /api/admin/studio-leads/[id]/audit — Website Audit Engine (Studio, phase 3).
//   POST  start an audit: validate → normalize the lead's existing_url → clear
//         zombies → atomic single-run INSERT (unique index) → after() job → 202.
//   GET   read audits + on-read staleness flip. ?poll=1 → { latest } only;
//         otherwise { latest, history }. A query error → 500 (never []).
// Admin-only; every failure path returns JSON. Node runtime — the crawler uses
// node:dns/node:net (guard against an accidental edge conversion).

import { NextRequest, NextResponse, after } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { normalizeAuditUrl } from '@/lib/studio/audit/crawl';
import { runAudit, flipStaleAudits } from '@/lib/studio/audit/run';
import { getLeadAudits, getLatestLeadAudit } from '@/lib/admin/queries';
import type { LeadAuditSummary } from '@/lib/admin/queries';
import type { LeadAudit } from '@/lib/admin/types';

export const maxDuration = 300;
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function toSummary(a: LeadAudit): LeadAuditSummary {
  return { id: a.id, created_at: a.created_at, status: a.status, overall: a.scores?.overall ?? null };
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
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from('leads')
    .select('id, business_name, industry, existing_url')
    .eq('id', id)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const norm = normalizeAuditUrl(lead.existing_url as string | null);
  if (!norm.ok) {
    return NextResponse.json({ error: norm.error }, { status: 400 });
  }

  // Clear zombies first so a stale >7-min 'generating' row doesn't block a fresh
  // run under the partial unique index below.
  await flipStaleAudits(admin, id);

  // Atomic single-run guard: uq_lead_audits_one_generating turns a concurrent
  // double-POST into a 23505 on the second INSERT (→ 409), not a SELECT race.
  const { data: inserted, error: insErr } = await admin
    .from('lead_audits')
    .insert({ lead_id: id, audited_url: norm.url, status: 'generating' })
    .select('id')
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      return NextResponse.json({ error: 'An audit is already running.' }, { status: 409 });
    }
    console.error('[admin/studio-leads/audit] insert failed:', insErr);
    return NextResponse.json({ error: 'Failed to start the audit.' }, { status: 500 });
  }

  const auditId = inserted.id as string;

  after(() =>
    runAudit(admin, auditId, {
      leadId: id,
      company: lead.business_name as string,
      industry: (lead.industry as string | null) ?? null,
      url: norm.url,
    }),
  );

  return NextResponse.json({ auditId }, { status: 202 });
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
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
  }

  // Confirm the lead exists (symmetry with POST — no "valid UUID → empty 200").
  const admin = createAdminClient();
  const { data: lead } = await admin
    .from('leads')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  // No cron: zombie 'generating' rows >7 min flip to 'failed' on read.
  await flipStaleAudits(admin, id);

  const poll = request.nextUrl.searchParams.get('poll') === '1';
  try {
    if (poll) {
      const latest = await getLatestLeadAudit(id);
      return NextResponse.json({ latest });
    }
    const audits = await getLeadAudits(id, 20);
    return NextResponse.json({
      latest: audits[0] ?? null,
      history: audits.map(toSummary),
    });
  } catch (err) {
    console.error('[admin/studio-leads/audit] read failed:', err);
    return NextResponse.json({ error: 'Failed to load audits.' }, { status: 500 });
  }
}
