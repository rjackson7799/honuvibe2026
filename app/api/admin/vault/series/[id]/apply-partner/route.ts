import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: seriesId } = await params;
  const body = (await req.json()) as { partner_id?: string | null };
  const { partner_id } = body;

  if (!partner_id) {
    return NextResponse.json({ error: 'partner_id required' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify the series exists before bulk-updating its items
  const { data: series, error: seriesError } = await adminClient
    .from('vault_series')
    .select('id')
    .eq('id', seriesId)
    .maybeSingle();

  if (seriesError) {
    console.error('[Admin/Vault/Series/ApplyPartner] series lookup failed:', seriesError);
    return NextResponse.json({ error: seriesError.message }, { status: 500 });
  }
  if (!series) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 });
  }

  // Bulk-update all content_items belonging to this series
  const { data: updatedRows, error } = await adminClient
    .from('content_items')
    .update({ partner_id })
    .eq('series_id', seriesId)
    .select('id');

  if (error) {
    console.error('[Admin/Vault/Series/ApplyPartner] bulk update failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: updatedRows?.length ?? 0 });
}
