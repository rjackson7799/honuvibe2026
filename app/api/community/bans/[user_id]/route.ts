import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canModeratePartner } from '@/lib/community/moderation';
import { logModAction, unbanUser } from '@/lib/community/mutations';

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ user_id: string }> },
) {
  const { user_id: targetUserId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const partnerParam = url.searchParams.get('partner_id');
  const partnerId =
    partnerParam && partnerParam.length > 0 ? partnerParam : null;

  if (!(await canModeratePartner(supabase, partnerId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await unbanUser(supabase, partnerId, targetUserId);
  await logModAction(supabase, {
    actor_id: user.id,
    action: 'unban',
    target_type: 'user',
    target_id: targetUserId,
    partner_id: partnerId,
  });
  return NextResponse.json({ ok: true });
}
