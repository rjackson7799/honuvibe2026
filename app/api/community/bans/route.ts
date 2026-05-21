import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canModeratePartner } from '@/lib/community/moderation';
import { banUser, logModAction } from '@/lib/community/mutations';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { partner_id?: unknown; user_id?: unknown; reason?: unknown }
    | null;
  if (!body || typeof body.user_id !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const partnerId =
    typeof body.partner_id === 'string' && body.partner_id.length > 0
      ? body.partner_id
      : null;

  if (!(await canModeratePartner(supabase, partnerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await banUser(supabase, {
    partner_id: partnerId,
    user_id: body.user_id,
    banned_by: user.id,
    reason: typeof body.reason === 'string' ? body.reason : null,
  });
  await logModAction(supabase, {
    actor_id: user.id,
    action: 'ban',
    target_type: 'user',
    target_id: body.user_id,
    partner_id: partnerId,
    metadata: { reason: typeof body.reason === 'string' ? body.reason : null },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
