// /api/admin/prospects/[id] — dismiss/restore a prospect (Studio, phase 4).
// PATCH { action: 'dismiss' | 'restore' }. Dismiss stores the prior status in
// dismissed_from so restore is lossless ("back to exactly the state it was
// dismissed from" — no re-score is triggered). Both writes are read-then-
// conditional-write with the status in the WHERE (the fence idiom): a losing
// race returns 409, never a clobbered status. Converted is final (409).

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

export async function PATCH(
  request: NextRequest,
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

  let action: string;
  try {
    const body = (await request.json()) as { action?: unknown };
    action = typeof body.action === 'string' ? body.action : '';
  } catch {
    action = '';
  }
  if (action !== 'dismiss' && action !== 'restore') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: prospect, error: readErr } = await admin
    .from('prospects')
    .select('id, status, dismissed_from')
    .eq('id', id)
    .maybeSingle();
  if (readErr) {
    console.error('[admin/prospects] read failed:', readErr);
    return NextResponse.json({ error: 'Failed to load the prospect.' }, { status: 500 });
  }
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  if (action === 'dismiss') {
    // Converted is final; double-dismiss is a no-op conflict.
    if (prospect.status === 'converted' || prospect.status === 'dismissed') {
      return NextResponse.json({ error: 'This prospect cannot be dismissed.' }, { status: 409 });
    }
    // A dismissed 'scoring' row restores as 'new', not back into a phantom
    // in-flight state that would inflate scoringCount until the stale flip.
    const dismissedFrom = prospect.status === 'scoring' ? 'new' : prospect.status;
    const { data, error } = await admin
      .from('prospects')
      .update({ status: 'dismissed', dismissed_from: dismissedFrom })
      .eq('id', id)
      .eq('status', prospect.status) // fence: lose any race, don't clobber
      .select('id');
    if (error) {
      console.error('[admin/prospects] dismiss failed:', error);
      return NextResponse.json({ error: 'Failed to dismiss the prospect.' }, { status: 500 });
    }
    if ((data?.length ?? 0) === 0) {
      return NextResponse.json({ error: 'The prospect changed — reload and retry.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  // restore — back to exactly the state it was dismissed from. A restored
  // 'new' row becomes eligible for scoring on the next search that returns it.
  if (prospect.status !== 'dismissed') {
    return NextResponse.json({ error: 'Only dismissed prospects can be restored.' }, { status: 409 });
  }
  const { data, error } = await admin
    .from('prospects')
    .update({ status: prospect.dismissed_from ?? 'new', dismissed_from: null })
    .eq('id', id)
    .eq('status', 'dismissed')
    .select('id');
  if (error) {
    console.error('[admin/prospects] restore failed:', error);
    return NextResponse.json({ error: 'Failed to restore the prospect.' }, { status: 500 });
  }
  if ((data?.length ?? 0) === 0) {
    return NextResponse.json({ error: 'The prospect changed — reload and retry.' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
