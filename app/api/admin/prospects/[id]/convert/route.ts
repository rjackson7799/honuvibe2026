// /api/admin/prospects/[id]/convert — prospect → lead (Studio, phase 4).
// Thin wrapper over the convert_prospect RPC (decision D1): a single
// transaction that row-locks the prospect, returns the existing lead when
// already converted, else inserts the lead + marks the prospect converted.
// Idempotent by construction — a double-click yields the same leadId with
// existing: true, never a second lead.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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
    return NextResponse.json({ error: 'Invalid prospect id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('convert_prospect', { p_prospect_id: id });

  if (error) {
    if (error.message?.includes('prospect_not_found')) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }
    console.error('[admin/prospects/convert] RPC failed:', error);
    return NextResponse.json({ error: 'Failed to convert the prospect.' }, { status: 500 });
  }

  // RETURNS TABLE → an array of one row.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { lead_id: string; already_converted: boolean }
    | undefined;
  if (!row?.lead_id) {
    console.error('[admin/prospects/convert] RPC returned no row:', data);
    return NextResponse.json({ error: 'Failed to convert the prospect.' }, { status: 500 });
  }

  return NextResponse.json({ leadId: row.lead_id, existing: row.already_converted });
}
