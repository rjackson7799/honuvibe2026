import { NextRequest, NextResponse } from 'next/server';
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

export async function GET() {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from('partners')
    .select('id, slug, name_en, name_jp, logo_url, primary_color, is_public, is_active, revenue_share_pct, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin/Partners] list failed:', error);
    return NextResponse.json({ error: 'Failed to load partners' }, { status: 500 });
  }

  // Enrich with enrollment counts
  const partnerIds = (data ?? []).map((p) => p.id);
  let counts: Record<string, number> = {};
  if (partnerIds.length > 0) {
    const { data: enrollRows } = await adminSupabase
      .from('enrollments')
      .select('partner_id')
      .in('partner_id', partnerIds);
    counts = (enrollRows ?? []).reduce<Record<string, number>>((acc, row) => {
      const pid = row.partner_id as string | null;
      if (pid) acc[pid] = (acc[pid] ?? 0) + 1;
      return acc;
    }, {});
  }

  const partners = (data ?? []).map((p) => ({
    ...p,
    enrollments_count: counts[p.id] ?? 0,
  }));

  return NextResponse.json({ partners });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as {
    slug?: string;
    name_en?: string;
    name_jp?: string | null;
  };

  const slug = body.slug?.trim();
  const name_en = body.name_en?.trim();

  if (!slug || !name_en) {
    return NextResponse.json(
      { error: 'slug and name_en are required' },
      { status: 400 },
    );
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase letters, digits, and hyphens only' },
      { status: 400 },
    );
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from('partners')
    .insert({
      slug,
      name_en,
      name_jp: body.name_jp?.trim() || null,
      is_public: true,
      is_active: true,
    })
    .select('id, slug')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A partner with that slug already exists' }, { status: 409 });
    }
    console.error('[Admin/Partners] create failed:', error);
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 });
  }

  return NextResponse.json({ partner: data }, { status: 201 });
}
