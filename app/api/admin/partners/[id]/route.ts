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

const PATCHABLE_FIELDS = [
  'slug',
  'name_en',
  'name_jp',
  'tagline_en',
  'tagline_jp',
  'description_en',
  'description_jp',
  'logo_url',
  'primary_color',
  'secondary_color',
  'website_url',
  'contact_email',
  'revenue_share_pct',
  'is_public',
  'is_active',
] as const;

type PatchableField = (typeof PATCHABLE_FIELDS)[number];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const adminSupabase = createAdminClient();

  const { data: partner, error } = await adminSupabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[Admin/Partners] get failed:', error);
    return NextResponse.json({ error: 'Failed to load partner' }, { status: 500 });
  }
  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  const { data: courseLinks } = await adminSupabase
    .from('partner_courses')
    .select('course_id, display_order')
    .eq('partner_id', id)
    .order('display_order', { ascending: true });

  return NextResponse.json({
    partner,
    featured_course_ids: (courseLinks ?? []).map((r) => r.course_id),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown> & {
    featured_course_ids?: string[];
  };

  const updates: Partial<Record<PatchableField, unknown>> = {};
  for (const key of PATCHABLE_FIELDS) {
    if (key in body) {
      const value = body[key];
      // Normalize empty strings to null for optional fields
      if (typeof value === 'string' && value.trim() === '' && key !== 'slug' && key !== 'name_en') {
        updates[key] = null;
      } else {
        updates[key] = value;
      }
    }
  }

  if (updates.slug && typeof updates.slug === 'string') {
    const slug = updates.slug.trim();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'slug must be lowercase letters, digits, and hyphens only' },
        { status: 400 },
      );
    }
    updates.slug = slug;
  }

  const adminSupabase = createAdminClient();

  if (Object.keys(updates).length > 0) {
    const { error } = await adminSupabase
      .from('partners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
      }
      console.error('[Admin/Partners] patch failed:', error);
      return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 });
    }
  }

  // Replace featured-courses selection if provided
  if (Array.isArray(body.featured_course_ids)) {
    const nextIds = body.featured_course_ids.filter((v): v is string => typeof v === 'string');

    await adminSupabase.from('partner_courses').delete().eq('partner_id', id);

    if (nextIds.length > 0) {
      const rows = nextIds.map((course_id, idx) => ({
        partner_id: id,
        course_id,
        display_order: idx,
      }));
      const { error: insertError } = await adminSupabase.from('partner_courses').insert(rows);
      if (insertError) {
        console.error('[Admin/Partners] course link failed:', insertError);
        return NextResponse.json(
          { error: 'Partner saved but course list failed — retry' },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const adminSupabase = createAdminClient();

  // Soft delete — preserve historical enrollment attribution
  const { error } = await adminSupabase
    .from('partners')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[Admin/Partners] soft delete failed:', error);
    return NextResponse.json({ error: 'Failed to deactivate partner' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
