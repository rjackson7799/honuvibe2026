import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canModeratePartner } from '@/lib/community/moderation';
import { logModAction, resolveReport } from '@/lib/community/mutations';

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: report } = await supabase
    .from('community_reports')
    .select('id, partner_id')
    .eq('id', id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (!(await canModeratePartner(supabase, report.partner_id as string | null))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await resolveReport(supabase, id, user.id);
  await logModAction(supabase, {
    actor_id: user.id,
    action: 'resolve_report',
    target_type: 'report',
    target_id: id,
    partner_id: report.partner_id as string | null,
  });
  return NextResponse.json({ ok: true });
}
